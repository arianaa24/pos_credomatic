# -*- encoding: utf-8 -*-
{
    'name': 'POS Credomátic',
    'version': '1.2',
    'category': 'Custom',
    'description': """ POS Credomátic """,
    'author': 'aquíH',
    'website': 'http://aquih.com/',
    'depends': ['account', 'point_of_sale'],
    'data': [
        'data/account_data.xml',
        'security/ir.model.access.csv',
        'views/pos_payment_method_view.xml',
        'views/pos_order_view.xml',
        'views/res_config_settings_view.xml',
        'views/pos_session_view.xml',
    ],
    'assets':{
        'point_of_sale._assets_pos': [
            'pos_credomatic/static/lib/**/*',
            'pos_credomatic/static/src/**/*',
        ],
    },
}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
