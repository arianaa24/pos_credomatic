/** @odoo-module */
import { _t } from "@web/core/l10n/translation";
import { PaymentInterface } from "@point_of_sale/app/payment/payment_interface";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { roundPrecision as round_pr } from "@web/core/utils/numbers";
let timeoutID;

export class PaymentCredomatic extends PaymentInterface {

    send_payment_request(cid) {
        super.send_payment_request(...arguments);
        var order = this.pos.get_order();
        var line = order.selected_paymentline;
        console.log("order", order); 

        this.startTimer(line);
        line.set_payment_status('waitingCard');
        
        if (line.payment_method.pago_puntos == true){
           return this.points_payment_request(order, line);
        }else{
            return this.normal_payment_request(order, line);
        }
    }

    startTimer(line) {
        timeoutID = setTimeout(this.stopFunction(line), 3 * 60 * 1000); // Límite de tiempo: 3 minutes
    }
    
    stopFunction(line) {
        clearTimeout(timeoutID);
        line.set_payment_status('retry');
        return false;
    }

    normal_payment_request(order, line) {
        var payment_data = "terminalId:EMVCMO01;transactionType:SALE;invoice:"+order.uid+";totalAmount:"+line.amount;
        var response = this.SdkInvoke(payment_data);               
        //var response = '{ "responseCode":"00", "authorizationNumber":"987654321"}'; /// INVENTADO
        var json_response = JSON.parse(response);
        return this.response_eval(json_response, line);
    }

    points_payment_request(order, line) {
        if (line.amount == order.get_total_with_tax()){
            var payment_data = "terminalId:EMVCMO01;transactionType:POINTS;invoice:"+order.uid+";totalAmount:"+line.amount+";pointsPlan:00";
            var response = this.SdkInvoke(payment_data);
            //var response = '{ "responseCode":"00", "authorizationNumber":"123456789"}'; /// INVENTADO
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
        console.log("response", response);
        if (response == false || (response['responseCode'] != '00' && response['responseCode'] != '08')){
            line.set_payment_status('retry');
            this.env.services.popup.add(ErrorPopup, {
                title: _t("No se pudo realizar el pago (%s)", response['responseCode']),
                body: _t("%s", response['responseCodeDescription']),
            });
            return Promise.resolve();
        }else{
            line.numero_autorizacion = response['authorizationNumber'];
            line.set_payment_status('done');
            return Promise.resolve(true);
        }
    }


    //Métodos de integración
    
     SdkInvoke(text) {
        return this.invoke("SdkInvoke", text);
    }
    
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
            data: this.stringify(message),
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
    
    stringify(json) {
        // http://www.west-wind.com/weblog/posts/2009/Sep/15/Making-jQuery-calls-to-WCFASMX-with-a-ServiceProxy-Client
        var reIso = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/;
        /// <summary>
        /// Wcf specific stringify that encodes dates in the
        /// a WCF compatible format ("/Date(9991231231)/")
        /// Note: this format works ONLY with WCF. 
        ///       ASMX can use ISO dates as of .NET 3.5 SP1
        /// </summary>
        /// <param name="key" type="var">property name</param>
        /// <param name="value" type="var">value of the property</param>         
        return JSON.stringify(json, function(key, value) {
            if (typeof value == "string") {
                var a = reIso.exec(value);
                if (a) {
                    var val = '/Date(' + new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6])).getTime() + ')/';
                    this[key] = val;
                    return val;
                }
            }
            return value;
        });
    }
}
