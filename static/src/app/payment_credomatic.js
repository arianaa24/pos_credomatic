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
        
        if (line.payment_method.pago_puntos == true){
            payment_data = "terminalId:"+this.pos.config.terminal_id+";transactionType:POINTS;invoice:"+order.uid+";totalAmount:"+line.amount+";pointsPlan:00";
            return this.verify_points_payment(payment_data, order, line);
        }else{
            payment_data = "terminalId:"+this.pos.config.terminal_id+";transactionType:SALE;invoice:"+order.uid+";totalAmount:"+line.amount;
            return this.payment_request(payment_data, line);
        }
    }

    startTimer(line) {
        timeoutID = setTimeout(this.stopFunction(line), 3 * 60 * 1000); // Límite de tiempo: 3 minutos
    }
    
    stopFunction(line) {
        clearTimeout(timeoutID);
        line.set_payment_status('retry');
        return false;
    }

    payment_request(payment_data, line) {
        var service = new ServiceProvider();
        var response = service.SdkInvoke(payment_data); 

        var string_to_parse = response.replace(/(\r\n|\r|\n)/g, '\\r\\n');
        string_to_parse = string_to_parse.substring(0, string_to_parse.length - 4);

        var json_response = JSON.parse(string_to_parse);
        return this.response_eval(json_response, line);
    }

    verify_points_payment(payment_data, order, line) {
        let is_zero = floatIsZero(
            order.get_total_with_tax() - line.amount,
            this.pos.currency.decimal_places
        )
        if (is_zero == true){
            return this.payment_request(payment_data, line);
        }else{
            line.set_payment_status('retry');
            this.env.services.popup.add(ErrorPopup, {
                title: _t("No se puede realizar el pago"),
                body: _t("Para redimir los puntos debe pagar el monto total."),
            });
		    return Promise.resolve();
        }
    }

    response_eval(response, line){
        console.info("response", response);
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
                title: _t("No se pudo realizar el pago %s", response_code),
                body: _t("%s", response_description),
            });
            return Promise.resolve();
        }else{
            if (response['voucher']){
                line.voucher = response['voucher']
            }
            line.numero_autorizacion = response['authorizationNumber'];
            line.set_payment_status('done');
            return Promise.resolve(true);
        }
    }
    
}
