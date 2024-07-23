from odoo import models, fields

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    terminal_id = fields.Char("Terminal ID para cobro automático", related='pos_config_id.terminal_id', readonly=False)
    terminal_puntos_id = fields.Char("Terminal ID para cobro con puntos", related='pos_config_id.terminal_puntos_id', readonly=False)
    equivalencia_puntos = fields.Integer("Cantidad de puntos por quetzal", related='pos_config_id.equivalencia_puntos', readonly=False)
    cantidad_minima_puntos = fields.Monetary("Venta mínima en quetzales para canje de puntos", related='pos_config_id.cantidad_minima_puntos', readonly=False)