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

    async printChanges(cancelled) {
        console.info('entra a formato comanda')
        const orderChange = this.changesToOrder(cancelled);
        let isPrintSuccessful = true;
        const d = new Date();
        let hours = "" + d.getHours();
        hours = hours.length < 2 ? "0" + hours : hours;
        let minutes = "" + d.getMinutes();
        minutes = minutes.length < 2 ? "0" + minutes : minutes;
        let date = d.getDate() + "/" + (d.getMonth()+1) + "/" + d.getFullYear();
        for (const printer of this.pos.unwatched.printers) {
            const changes = this._getPrintingCategoriesChanges(
                printer.config.product_categories_ids,
                orderChange
            );
            if (changes["new"].length > 0 || changes["cancelled"].length > 0) {
                const printingChanges = {
                    new: changes["new"],
                    cancelled: changes["cancelled"],
                    table_name: this.pos.config.module_pos_restaurant
                        ? this.getTable().name
                        : false,
                    floor_name: this.pos.config.module_pos_restaurant
                        ? this.getTable().floor.name
                        : false,
                    name: this.name || "unknown order",
                    time: {
                        hours,
                        minutes,
                        date,
                    },
                    trackingNumber: this.trackingNumber,
                };
                const receipt = renderToElement("point_of_sale.OrderChangeReceipt", {
                    changes: printingChanges,
                });
                const result = await printer.printReceipt(receipt);
                if (!result.successful) {
                    isPrintSuccessful = false;
                }
            }
        }
        return isPrintSuccessful;
    }

});