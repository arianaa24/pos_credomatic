from odoo import models, fields

class PosConfig(models.Model):
    _inherit = 'pos.config'

    terminal_id = fields.Char("Terminal ID para cobro automático", store=True)
    terminal_puntos_id = fields.Char("Terminal ID para cobro con puntos", store=True)
    equivalencia_puntos = fields.Integer("Cantidad de puntos por quetzal", store=True, help="Cantidad de puntos por Q1")
    cantidad_minima_puntos = fields.Monetary("Venta mínima en quetzales para canje de puntos", currency_field="company_currency_id", store=True)
    company_currency_id = fields.Many2one("res.currency", related="company_id.currency_id", string="Moneda", readonly=True, store=True)

