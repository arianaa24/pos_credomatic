from odoo import models, fields

class PosConfig(models.Model):
    _inherit = 'pos.config'

    terminal_id = fields.Char("Terminal ID", store=True)
