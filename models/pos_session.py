from odoo import models, fields
import logging

class PosSession(models.Model):
    _inherit = 'pos.session'

    lineas_cierre_ids = fields.One2many('pos_credomatic.cierre_sesion', 'session_id', string="Cierres de caja")


    def _pos_ui_models_to_load(self):
        models_to_load = super(PosSession, self)._pos_ui_models_to_load()
        models_to_load.append('pos_credomatic.cierre_sesion')  
        return models_to_load
    
    def _loader_params_pos_credomatic_cierre_sesion(self):
        return {
            'search_params': {
                'fields': ['lote', 'hostDate'], 
            }
        }
    
    def _get_pos_ui_pos_credomatic_cierre_sesion(self, params):
        return self.env['pos_credomatic.cierre_sesion'].search_read(**params['search_params'])

    def _loader_params_pos_payment_method(self):
        result = super()._loader_params_pos_payment_method()
        result['search_params']['fields'].extend(['pago_puntos','pago_manual'])
        return result
    
class CierrePosSession(models.Model):
    _name = 'pos_credomatic.cierre_sesion'
    _description = 'Cierres de caja en pos'

    lote = fields.Char(string="Lote")
    tipo = fields.Char(string="Tipo de caja")
    hostDate = fields.Char(string="Host date")
    hostTime = fields.Char(string="Host time")
    salesAmount = fields.Float(string="Total de ventas")
    salesTransactions = fields.Integer(string="Cantidad de ventas")
    refundsAmount = fields.Float(string="Total de reembolsos")
    refundsTransactions = fields.Integer(string="Cantidad de reembolsos")
    TerminalDisplayLine1Voucher = fields.Char(string="Voucher linea 1")
    TerminalDisplayLine2Voucher = fields.Char(string="Voucher linea 2")
    TerminalDisplayLine3Voucher = fields.Char(string="Voucher linea 3")
    session_id = fields.Many2one('pos.session', string="Sesión", ondelete='cascade')