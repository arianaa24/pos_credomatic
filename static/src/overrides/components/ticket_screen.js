/** @odoo-module **/

import { _t } from "@web/core/l10n/translation";
import { TicketScreen } from "@point_of_sale/app/screens/ticket_screen/ticket_screen";
import { patch } from "@web/core/utils/patch";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { useService } from "@web/core/utils/hooks";
import { SelectionPopup } from "@point_of_sale/app/utils/input_popups/selection_popup";
import { AnulacionReceipt } from "@pos_credomatic/app/anulacion_receipt";

patch(TicketScreen.prototype, {
    setup() {
        super.setup(...arguments);
        this.printer = useService("printer");
    },
    
    async anularTransaccion() {
        const order = this.getSelectedOrder();
        const paymentList = order.paymentlines
            .filter((payment_line) => (payment_line.payment_method.use_payment_terminal == "credomatic" && payment_line.get_payment_status() != 'reversed'))
            .map((payment_line) => {
                return {
                    id: payment_line.id,
                    item: payment_line,
                    label: payment_line.name,
                    isSelected: false,
                };
            });
        if (!paymentList.length) {
            await this.popup.add(ErrorPopup, {
                title: _t("Información"),
                body: _t("No hay líneas de pago para anular."),
            });
            return
        }
        const { confirmed, payload: payment_line } = await this.popup.add(SelectionPopup, {
            title: _t("Seleccionar línea de pago a anular"),
            list: paymentList,
        });

        if (!confirmed || !payment_line) {
            return;
        } else {
            var service = new ServiceProvider();
            console.info(payment_line)

            // ANULACION
            var payment_data = "terminalId:"+order.pos.config.terminal_id+";transactionType:VOID;authorizationNum:"+payment_line.numero_autorizacion+";referenceNumber:"+payment_line.reference_number+";systemTraceNum:"+payment_line.system_trace_num;
            console.info(payment_data)
            var response = service.SdkInvoke(payment_data);
            
            try {
                console.log('response', response)
                var string_to_parse = response.replace(/(\r\n|\r|\n)/g, '\\r\\n');
                string_to_parse = string_to_parse.substring(0, string_to_parse.length - 4);
                console.log(string_to_parse)
                var json_response = JSON.parse(string_to_parse);
                console.info("json_response", json_response);
                return this.response_eval(json_response, payment_line, order);
            } 
            catch(err){
                console.info("response with error", err);
                this.env.services.popup.add(ErrorPopup, {
                    title: _t("No se pudo realizar la anulación"),
                    body: _t("Respuesta del servicio: %s", response),
                });
                return;
            }
        }
    },

    async response_eval(response, line, order){
        var response_code, response_description;
        if (response == false || (response['responseCode'] != '00' && response['responseCode'] != '08')){
            if (response['responseCode']){
                response_code = response['responseCode'];
                response_description = response['responseCodeDescription'];
            }else{
                response_code = '';
                response_description = 'Error de conexión.';
            }
            this.env.services.popup.add(ErrorPopup, {
                title: _t("No se pudo realizar la anulación del pago: %s", response_code),
                body: _t("%s", response_description),
            });
            return;

        }else{
            puntos = ''
            if(line.name == "Credomátic Puntos"){
                puntos = 'PUNTOS'
            }
            var voucher_anulacion = "              "+response['TerminalDisplayLine1Voucher']+"               \n         "+response['TerminalDisplayLine2Voucher']+"        \n                "+response['TerminalDisplayLine3Voucher']+"                 \nTerminald ID:                   "+order.pos.config.terminal_id+"\n          ***  ANULACION "+puntos+" ***           \n"+response['cardBrand']+"              "+response['maskedCardNumber']+"\nAUTH: "+response['authorizationNumber']+"                            \nREF:                            "+response['referenceNumber']+"\n					  \nFECHA: "+response['hostDate']+"              "+response['hostTime']+"\n					  \nTOTAL:                "+response['cardBrand']+". -"+response['salesAmount']+"\n					  \n					  \n           ****** FIN  ******           \n					  \n- - - - - - - - - - - - - - - - - - - -\n        ***  COPIA CLIENTE  ***         \n					  \n              "+response['TerminalDisplayLine1Voucher']+"               \n       "+ response['TerminalDisplayLine2Voucher']+"        \n                "+response['TerminalDisplayLine3Voucher']+"                 \nTerminald ID:                   "+order.pos.config.terminal_id+"\n          ***  ANULACION "+puntos+" ***           \n"+response['cardBrand']+"              "+response['maskedCardNumber']+"\nAUTH: "+response['authorizationNumber']+"                            \nREF:                            "+response['referenceNumber']+"\n					  \nFECHA: "+response['hostDate']+"              "+response['hostTime']+"\n					\nTOTAL:                "+response['cardBrand']+". -"+response['salesAmount']+"\n					  \n           ****** FIN  ******           \n"
            line.anulacion_voucher = voucher_anulacion;
            line.numero_autorizacion_anulacion = response['authorizationNumber'];
            line.set_payment_status('reversed');
            await this.printer.print(
                AnulacionReceipt,
                {
                    data: order.export_for_printing(),
                    formatCurrency: this.env.utils.formatCurrency,
                },
                { webPrintFallback: true }
            );
            return true;
        }
    }
});