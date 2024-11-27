/** @odoo-module */

import { register_payment_method } from "@point_of_sale/app/store/pos_store";
import { PaymentCredomatic } from "@pos_credomatic/app/payment_credomatic";
import { Payment, Order } from "@point_of_sale/app/store/models";
import { patch } from "@web/core/utils/patch";

register_payment_method("credomatic", PaymentCredomatic);

patch(Payment.prototype, {

    setup(obj, options) {
        super.setup(...arguments);
        this.numero_autorizacion = '';
        this.voucher = '';
        this.reference_number = '';
        this.system_trace_num = '';
        this.anulacion_voucher = '';
        this.numero_autorizacion_anulacion = '';
        this.lote = '';
    },

    init_from_JSON(json) {
        super.init_from_JSON(...arguments);
        this.numero_autorizacion = json.numero_autorizacion;
        this.reference_number = json.reference_number;
        this.system_trace_num = json.system_trace_num;
        this.numero_autorizacion_anulacion = json.numero_autorizacion_anulacion;
        this.lote = json.lote;
    },

    export_as_JSON(){
        const json = super.export_as_JSON(...arguments);
        json.numero_autorizacion = this.numero_autorizacion;
        json.reference_number = this.reference_number;
        json.system_trace_num = this.system_trace_num;
        json.numero_autorizacion_anulacion = this.numero_autorizacion_anulacion;
        json.lote = this.lote;
        return json;
    },

    export_for_printing(){
        const json = super.export_for_printing(...arguments);
        json.numero_autorizacion = this.numero_autorizacion;
        json.voucher = this.voucher;
        json.anulacion_voucher = this.anulacion_voucher;
        json.numero_autorizacion_anulacion = this.numero_autorizacion_anulacion;
        return json;
    },

});

patch(Order.prototype, {

    init_from_JSON(json) {
        super.init_from_JSON(...arguments);
        var paymentlines = json.statement_ids;
        for (var i = 0; i < paymentlines.length; i++) {
            this.paymentlines[i].numero_autorizacion = paymentlines[i][2].numero_autorizacion;
            this.paymentlines[i].reference_number = paymentlines[i][2].reference_number;
            this.paymentlines[i].system_trace_num = paymentlines[i][2].system_trace_num;
            this.paymentlines[i].numero_autorizacion_anulacion = paymentlines[i][2].numero_autorizacion_anulacion;
        }
    },

});