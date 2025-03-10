/** @odoo-module */
import { _t } from "@web/core/l10n/translation";
import { PaymentInterface } from "@point_of_sale/app/payment/payment_interface";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { floatIsZero } from "@web/core/utils/numbers";
let timeoutID;

export class PaymentCredomatic extends PaymentInterface {

    send_payment_request(cid) {
        super.send_payment_request(...arguments);
        var order = this.pos.get_order();
        var line = order.selected_paymentline;
        var payment_data = ""
        console.info("order", order);

        this.startTimer(line);
        line.set_payment_status('waitingCard');

        var order_number = order.uid.replaceAll("-", "")
        if (line.payment_method.pago_puntos == true){
            var points_amount = Math.ceil(line.amount * 15);
            payment_data = "terminalId:"+this.pos.config.terminal_puntos_id+";transactionType:POINTS;invoice:"+order_number+";totalAmount:"+points_amount+";pointsPlan:00";
            return this.verify_points_payment(payment_data, order, line, this.pos.config.terminal_puntos_id);
        }else{
            payment_data = "terminalId:"+this.pos.config.terminal_id+";transactionType:SALE;invoice:"+order_number+";totalAmount:"+line.amount;
            return this.payment_request(payment_data, line, this.pos.config.terminal_id);
        }
    }

    startTimer(line) {
        timeoutID = setTimeout(this.stopFunction(line), 60 * 1000); // Límite de tiempo: 1 minuto
    }
    
    stopFunction(line) {
        clearTimeout(timeoutID);
        line.set_payment_status('retry');
        return false;
    }

    payment_request(payment_data, line, terminal) {
        var service = new ServiceProvider();
        var response = service.SdkInvoke(payment_data); 
        response = '{"acqNumber":"","authorizationNumber":"041559","cardBrand":"retail EMV","hostDate":"09232024","hostTime":"171346","invoice":"undefined","maskedCardNumber":"448796XXXXXX0125","referenceNumber":"17015859","responseCode":"00","responseCodeDescription":"APROBADA","salesAmount":"000000000253","systemTraceNumber":"067836","transactionId":"06783517015859050158","currencyVoucher":"GTQ","TerminalDisplayLine1Voucher":"TEST ISC480","TerminalDisplayLine2Voucher":"PRUEBAS INTEGRACUONED BAC","TerminalDisplayLine3Voucher":"ZONA 12","trnTotalTime":"37429"}1234';

        try {
            var string_to_parse = response.replace(/(\r\n|\r|\n)/g, '\\r\\n');
            console.log(string_to_parse)
            string_to_parse = string_to_parse.substring(0, string_to_parse.length - 4);
            console.log(string_to_parse)

            var json_response = JSON.parse(string_to_parse);
            console.info("response", json_response);
            return this.response_eval(json_response, line, terminal);
        } 
        catch(err){
            console.info("response with error", err);
            this.env.services.popup.add(ErrorPopup, {
                title: _t("No se pudo realizar el pago"),
                body: _t("Respuesta del servicio: %s", response),
            });
            return Promise.resolve();
        }
    }

    verify_points_payment(payment_data, order, line, terminal) {
        if (order.get_total_with_tax() < this.pos.config.cantidad_minima_puntos){
            line.set_payment_status('retry');
            this.env.services.popup.add(ErrorPopup, {
                title: _t("No se puede realizar el pago"),
                body: _t("El monto mínimo para redimir puntos es %s.", this.pos.config.cantidad_minima_puntos),
            });
            return Promise.resolve();
        }else{
            let is_zero = floatIsZero(
                order.get_total_with_tax() - line.amount,
                this.pos.currency.decimal_places
            )
            if (is_zero == true){
                return this.payment_request(payment_data, line, terminal);
            }else{
                line.set_payment_status('retry');
                this.env.services.popup.add(ErrorPopup, {
                    title: _t("No se puede realizar el pago"),
                    body: _t("Para redimir los puntos debe pagar el monto total."),
                });
                return Promise.resolve();
            }
        }

        
    }

    response_eval(response, line, terminal){
        var response_code, response_description;
        if (response == false || (response['responseCode'] != '00' && response['responseCode'] != '08')){
            line.set_payment_status('retry');
            if (response['responseCode']){
                response_code = response['responseCode'];
                response_description = response['responseCodeDescription'];
            }else{
                response_code = '';
                response_description = 'Error de conexión.';
            }
            this.env.services.popup.add(ErrorPopup, {
                title: _t("No se pudo realizar el pago: %s", response_code),
                body: _t("%s", response_description),
            });
            return Promise.resolve();
        }else{
            var voucher_reporte = "               "+response['TerminalDisplayLine1Voucher']+"\n          "+response['TerminalDisplayLine2Voucher']+"\n                "+response['TerminalDisplayLine3Voucher']+"\nTerminald ID:                   "+terminal+"\n             ***  VENTA  ***\n"+response['cardBrand']+"              "+response['maskedCardNumber']+"\nAUTH: "+response['authorizationNumber']+"    TRX: "+line.order.uid.replaceAll("-", "")+"\nREF:                            "+response['referenceNumber']+"\n\nFECHA: "+response['hostDate'].substring(2, 4)+"/"+response['hostDate'].substring(0, 2)+"/"+response['hostDate'].substring(4, 8)+"                  "+response['hostTime'].substring(0, 2)+":"+response['hostTime'].substring(2, 4)+"\n\nTOTAL:                     "+response['currencyVoucher']+". "+parseFloat(line.amount).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })+"\n                ***  ***\n\n               VISA DEBITO\nTRANSACTION ID      "+response['transactionId']+"\n\n            ****** FIN ******\n\n - - - - - - - - - - - - - - - - - - -\n          *** COPIA CLIENTE ***\n\n               "+response['TerminalDisplayLine1Voucher']+"\n          "+response['TerminalDisplayLine2Voucher']+"\n                "+response['TerminalDisplayLine3Voucher']+"\nTerminald ID:                   "+terminal+"\n             ***  VENTA  ***\n"+response['cardBrand']+"              "+response['maskedCardNumber']+"\nAUTH: "+response['authorizationNumber']+"    TRX: "+line.order.uid.replaceAll("-", "")+"\nREF:                            "+response['referenceNumber']+"\n\nFECHA: "+response['hostDate'].substring(2, 4)+"/"+response['hostDate'].substring(0, 2)+"/"+response['hostDate'].substring(4, 8)+"                  "+response['hostTime'].substring(0, 2)+":"+response['hostTime'].substring(2, 4)+"\n\nTOTAL:                     "+response['currencyVoucher']+". "+parseFloat(line.amount).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })+"\n                ***  ***\n\n               VISA DEBITO\nTRANSACTION ID      "+response['transactionId']+"\n\n            ****** FIN ******"
            line.voucher = voucher_reporte
            line.numero_autorizacion = response['authorizationNumber'];
            line.reference_number = response['referenceNumber'];
            line.system_trace_num = response['systemTraceNumber'];
            line.set_payment_status('done');
            return Promise.resolve(true);
        }
    }
    
}
