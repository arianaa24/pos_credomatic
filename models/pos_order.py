# -*- coding: utf-8 -*-
from odoo import api, fields, models

class PosOrder(models.Model):
    _inherit = 'pos.order'
    
    @api.model
    def _payment_fields(self, order, ui_paymentline):
        res = super(PosOrder, self)._payment_fields(order, ui_paymentline)
        res.update({'numero_autorizacion': ui_paymentline.get('numero_autorizacion'), 'reference_number': ui_paymentline.get('reference_number'), 'system_trace_num': ui_paymentline.get('system_trace_num'),'numero_autorizacion_anulacion': ui_paymentline.get('numero_autorizacion_anulacion'), 'lote':ui_paymentline.get('lote')})
        return res
