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
        console.info("order", order); 

        this.startTimer(line);
        line.set_payment_status('waitingCard');
        
        if (line.payment_method.pago_puntos == true){
            return this.points_payment_request(order, line);
        }else{
            return this.normal_payment_request(order, line);
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

    normal_payment_request(order, line) {
        var payment_data = "terminalId:EMVCMO01;transactionType:SALE;invoice:"+order.uid+";totalAmount:"+line.amount;
        var response = this.invoke("SdkInvoke", payment_data);    
        var json_response = JSON.parse(response);
        return this.response_eval(json_response, line);
    }

    points_payment_request(order, line) {
        let is_zero = floatIsZero(
            order.get_total_with_tax() - line.amount,
            this.pos.currency.decimal_places
        )
        if (is_zero == true){
            var payment_data = "terminalId:EMVCMO01;transactionType:POINTS;invoice:"+order.uid+";totalAmount:"+line.amount+";pointsPlan:00";
            var response = this.invoke("SdkInvoke", payment_data);
            var json_response = JSON.parse(response);
            return this.response_eval(json_response, line);
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
            line.numero_autorizacion = response['authorizationNumber'];
            line.set_payment_status('done');
            return Promise.resolve(true);
        }
    }


    //Métodos de integración
    
    invoke(method, message) {
        var response = false;
        this.proxy_invoke(method, message, function(result) {
            response = result;
        }, this.ProcessError);
        return response;
    }
    
    ProcessError(xhr) {
        var reason = xhr.status + ": " + xhr.statusText;
        alert("I've got an error: " + reason);
    }
    
    proxy_invoke(method, message, onSuccess, onError) {
        var serviceUrl = "http://localhost:0808/baccredomatic";
        $.ajax({
            url: serviceUrl + "/" + method,
            crossDomain: true,
            data: message,
            type: "POST",
            processData: false,
            contentType: "application/json",
            timeout: 10000,
            async: false,
            dataType: "text",  
            success: function (result) {
                var isVoid = result == "";
                var response = isVoid ? true : JSON.parse(result);
                if (onSuccess) {
                    onSuccess(response);
                }
            },
            error: function (xhr, status) {
                if (onError) {
                    onError(xhr, status);
                }
            },
        });
    }
    
}
