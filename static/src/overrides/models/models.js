/** @odoo-module */

import { register_payment_method } from "@point_of_sale/app/store/pos_store";
import { PaymentCredomatic } from "@pos_credomatic/app/payment_credomatic";
import { Payment } from "@point_of_sale/app/store/models";
import { patch } from "@web/core/utils/patch";

register_payment_method("credomatic", PaymentCredomatic);

patch(Payment.prototype, {

    setup(obj, options) {
        super.setup(...arguments);
        this.numero_autorizacion = '';
        this.voucher = '';
    },

    export_as_JSON(){
        const json = super.export_as_JSON(...arguments);
        json.numero_autorizacion = this.numero_autorizacion;
        return json;
    },

    export_for_printing(){
        const json = super.export_for_printing(...arguments);
        json.numero_autorizacion = this.numero_autorizacion;
        json.voucher = this.voucher;
        return json;
    },

});