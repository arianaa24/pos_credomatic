# -*- coding: utf-8 -*-
from odoo import api, fields, models

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


class PosPaymentMethod(models.Model):
    _inherit = 'pos.payment.method'

    pago_puntos = fields.Boolean("Pago con puntos")
    pago_manual = fields.Boolean("Pago manual")

    def _get_payment_terminal_selection(self):
        return super(PosPaymentMethod, self)._get_payment_terminal_selection() + [('credomatic', 'Credomatic')]
