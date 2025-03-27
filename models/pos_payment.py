# -*- coding: utf-8 -*-
from odoo import api, fields, models
from datetime import datetime, time, timedelta

class PosPayment(models.Model):
    _inherit = "pos.payment"

    numero_autorizacion = fields.Char('Número de autorización')
    reference_number = fields.Char('Número de referencia')
    system_trace_num = fields.Char('System trace number')
    numero_autorizacion_anulacion = fields.Char('Número de autorización de anulación')
    lote = fields.Char('Número de lote')

    def _export_for_ui(self, payment):
        res = super(PosPayment, self)._export_for_ui(payment)
        res.update({'numero_autorizacion': payment.numero_autorizacion, 'reference_number': payment.reference_number, 'system_trace_num': payment.system_trace_num, 'numero_autorizacion_anulacion': payment.numero_autorizacion_anulacion, 'lote':payment.lote})
        return res
    
    def asignar_lote_cierre(self, name, config_id, response, session_id, terminal):
        today_start = fields.Datetime.to_datetime(fields.Date.today())
        today_end = datetime.combine(fields.Date.today(), time(23, 59, 59))
        domain = ['|', ['lote', '=', False], ['lote', '=', ''], 
                ["payment_method_id.use_payment_terminal", "=", "credomatic"], 
                ['pos_order_id.config_id.id','=',config_id['id']],
                '|', ['numero_autorizacion_anulacion', '=', False], ['numero_autorizacion_anulacion', '=', ''],
                ['payment_date', '>=', today_start], ['payment_date', '<=', today_end],
            ]
        if name == 'Credomátic Automático':
            domain.append(["payment_method_id.pago_puntos", "=", False])
        else:
            domain.append(["payment_method_id.pago_puntos", "=", True])
        
        paymentIds = self.env['pos.payment'].search(domain)
        for payment_id in paymentIds:
            self.env["pos.payment"].browse(payment_id.id).write({"lote": response['authorizationNumber']})
        
        values = {
            "lineas_cierre_ids": [
                (0, 0, { 
                    "lote": response["authorizationNumber"],
                    "tipo": name,
                    "session_id": session_id,
                    "hostDate": response["hostDate"],
                    "hostTime": response["hostTime"],
                    "refundsAmount": (
                        (float(response["refundsAmount"]) / 100) if terminal == config_id['terminal_id']
                        else (float(response["refundsAmount"]) / config_id['equivalencia_puntos'])
                    ),
                    "refundsTransactions": int(response["refundsTransactions"]),
                    "salesAmount": (
                        (float(response["salesAmount"]) / 100) if terminal == config_id['terminal_id']
                        else (float(response["salesAmount"]) / config_id['equivalencia_puntos'])
                    ),
                    "salesTransactions": int(response["salesTransactions"]),
                    "TerminalDisplayLine1Voucher": response["TerminalDisplayLine1Voucher"],
                    "TerminalDisplayLine2Voucher": response["TerminalDisplayLine2Voucher"],
                    "TerminalDisplayLine3Voucher": response["TerminalDisplayLine3Voucher"],
                })
            ]
        }
        self.env["pos.session"].browse(session_id).write(values)
        return {"result": "Cierre exitoso"}
    
    def get_paymentlines(self, name, config_id):
        quince_dias_atras = datetime.today().date() - timedelta(days=15)
        domain = [
                ("payment_method_id.use_payment_terminal", "=", "credomatic"),
                ("pos_order_id.config_id.id", "=", config_id['id']),
                ("payment_date", ">=", quince_dias_atras), 
            ]
        if name == "Credomátic Automático":
            domain.append(("payment_method_id.pago_puntos", "=", False))
        else:
            domain.append(("payment_method_id.pago_puntos", "=", True))
        paymentlines_ids = self.env["pos.payment"].search(domain)
        return paymentlines_ids.read()

class PosPaymentMethod(models.Model):
    _inherit = 'pos.payment.method'

    pago_puntos = fields.Boolean("Pago con puntos")
    pago_manual = fields.Boolean("Pago manual")

    def _get_payment_terminal_selection(self):
        return super(PosPaymentMethod, self)._get_payment_terminal_selection() + [('credomatic', 'Credomatic')]
