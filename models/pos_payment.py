# -*- coding: utf-8 -*-
from odoo import api, fields, models

class PosPayment(models.Model):
    _inherit = "pos.payment"

    numero_autorizacion = fields.Char('Número de autorización')

class PosPaymentMethod(models.Model):
    _inherit = 'pos.payment.method'

    pago_puntos = fields.Boolean("Pago con puntos")
    pago_manual = fields.Boolean("Pago manual")

    def _get_payment_terminal_selection(self):
        return super(PosPaymentMethod, self)._get_payment_terminal_selection() + [('credomatic', 'Credomatic')]
