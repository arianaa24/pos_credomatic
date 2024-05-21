from odoo import models, fields

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    terminal_id = fields.Char("Terminal ID", related='pos_config_id.terminal_id', readonly=False)