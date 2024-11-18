/** @odoo-module **/
import { _t } from "@web/core/l10n/translation";
import { Navbar } from "@point_of_sale/app/navbar/navbar";
import { patch } from "@web/core/utils/patch";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { useService } from "@web/core/utils/hooks";
import { SelectionPopup } from "@point_of_sale/app/utils/input_popups/selection_popup";
import { CierreCajaReceipt } from "@pos_credomatic/app/cierre_caja_receipt";

patch(Navbar.prototype, {
    setup() {
        super.setup(...arguments);
        this.printer = useService("printer");
    },
    
    cierreAutomatico() {
        var name = 'Credomátic Automático';   
        var terminal = this.pos.config.terminal_id;
        return this.cierreCaja(terminal, name);
    },
    cierrePuntos() {
        var name = 'Credomátic Puntos';   
        var terminal = this.pos.config.terminal_puntos_id;
        return this.cierreCaja(terminal, name);
    },
    async cierreCaja(terminal, name) {
        var service = new ServiceProvider();
        var data = "terminalId:"+terminal+";transactionType:BATCH_SETTLEMENT";
        var response = service.SdkInvoke(data);
        try {
            var string_to_parse = response.replace(/(\r\n|\r|\n)/g, '\\r\\n');
            string_to_parse = string_to_parse.substring(0, string_to_parse.length - 4);
            var json_response= JSON.parse(string_to_parse);
            console.info("json_response", json_response);
            return this.response_settlement_eval(json_response, terminal, name);
        } 
        catch(err){
            console.info("response with error", err);
            this.popup.add(ErrorPopup, {
                title: _t("No se pudo realizar el cierre"),
                body: _t("Respuesta del servicio: %s", response),
            });
            return;
        }
    },
    async response_settlement_eval(response, terminal, name){
        var response_code, response_description;
        if (response == false || (response['responseCode'] != '00' && response['responseCode'] != '08')){
            if (response['responseCode']){
                response_code = response['responseCode'];
                response_description = response['responseCodeDescription'];
            }else{
                response_code = '';
                response_description = 'Error de conexión.';
            }
            this.popup.add(ErrorPopup, {
                title: _t("No se pudo realizar el cierre: %s", response_code),
                body: _t("%s", response_description),
            });
            return;
        }else{
            const paymentIds = await this.pos.orm.search('pos.payment', [
                ["payment_method_id.name", "=", name],
                ['lote', '=', '']
            ]);
            for (var payment_id of paymentIds){
                await this.pos.orm.write('pos.payment', [payment_id], { lote: response['authorizationNumber'] });
            }
            var values = {
                lineas_cierre_ids: [
                    [0, 0, { 
                        lote: response['authorizationNumber'],
                        tipo: name, 
                        session_id: this.pos.pos_session.id, 
                        hostDate: response['hostDate'],
                        hostTime: response['hostTime'],
                        refundsAmount: (terminal == this.pos.config.terminal_id) ? (parseFloat(response['refundsAmount']) / 100).toFixed(2): (parseFloat(response['refundsAmount']/this.pos.config.equivalencia_puntos)),
                        refundsTransactions: parseInt(response['refundsTransactions']),
                        salesAmount: (terminal == this.pos.config.terminal_id) ? (parseFloat(response['salesAmount']) / 100).toFixed(2): (parseFloat(response['salesAmount']/this.pos.config.equivalencia_puntos)),
                        salesTransactions: parseInt(response['salesTransactions']),
                        TerminalDisplayLine1Voucher: response['TerminalDisplayLine1Voucher'],
                        TerminalDisplayLine2Voucher: response['TerminalDisplayLine2Voucher'],
                        TerminalDisplayLine3Voucher: response['TerminalDisplayLine3Voucher'], 
                    }] 
                ],
            };
            await this.pos.orm.write('pos.session', [this.pos.pos_session.id], values);

            await this.popup.add(ErrorPopup, {
                title: _t("Cierre realizado"),
                body: _t("Cierre realizado, %s actualizado.", response['authorizationNumber']),
            });
            return true;
        }
    },

    
    reporteAutomatico() {
        var name = 'Credomátic Automático';   
        var terminal = this.pos.config.terminal_id;
        return this.reporteCaja(name, terminal)
    },
    reportePuntos() {
        var name = 'Credomátic Puntos';
        var terminal = this.pos.config.terminal_puntos_id;
        return this.reporteCaja(name, terminal)
    },
    async reporteCaja(name, terminal) {
        var paymentFields = ["lote", "pos_order_id", "transaction_id", "reference_number", "numero_autorizacion", "amount", "payment_date", "numero_autorizacion_anulacion"];
        let paymentlines = await this.pos.orm.searchRead(
            "pos.payment",
            [["payment_method_id.name", "=", name]],
            paymentFields
        );
        var listaLotesSinDuplicados = [...new Set(paymentlines.filter((item) => (item.lote)).map(item => item.lote))];
        const LotesList = listaLotesSinDuplicados
            .map((lote) => {
                return {
                    id: lote,
                    item: lote,
                    label: lote,
                    isSelected: false,
                };
            });
        LotesList.unshift({item: "Sin Lote", label: "Sin lote", isSelected: false})

        const { confirmed, payload: lote } = await this.popup.add(SelectionPopup, {
            title: _t("Seleccionar lote para reporte de cierre"),
            list: LotesList,
        });
        if (!confirmed || !lote) {
            return;
        } else {
            if (lote == "Sin Lote"){
                var pagos_sin_lote = paymentlines.filter((item) => (item.lote == false && item.amount > 0));
                var devoluciones_sin_lote = paymentlines.filter((item) => (item.lote == false && item.amount < 0));

                var response = {
                    hostDate: new Date().toString(),
                    hostTime: new Date().toLocaleTimeString().toString(),
                    refundsAmount: devoluciones_sin_lote.reduce((sum, pago) => sum + pago.amount, 0),
                    refundsTransactions: devoluciones_sin_lote.length,
                    salesAmount: pagos_sin_lote.reduce((sum, pago) => sum + pago.amount, 0),
                    salesTransactions: pagos_sin_lote.length,
                    currencyVoucher:"GTQ",
                    TerminalDisplayLine1Voucher: '',
                    TerminalDisplayLine2Voucher: '',
                    TerminalDisplayLine3Voucher: '',
                }
                return this.impresion_reporte(response, terminal, lote, paymentlines);
            }else{
                var sessionFields = ['lote', 'hostDate', 'hostTime', 'refundsAmount', 'refundsTransactions','salesAmount', 'salesTransactions', 'TerminalDisplayLine1Voucher', 'TerminalDisplayLine2Voucher', 'TerminalDisplayLine3Voucher'];
                let sesion_id = await this.pos.orm.searchRead(
                    "pos_credomatic.cierre_sesion",
                    [["lote", "=", lote]],
                    sessionFields
                );
                var response = {
                    hostDate: sesion_id[0].hostDate,
                    hostTime: sesion_id[0].hostTime,
                    refundsAmount: sesion_id[0].refundsAmount,
                    refundsTransactions: sesion_id[0].refundsTransactions,
                    salesAmount: sesion_id[0].salesAmount,
                    salesTransactions: sesion_id[0].salesTransactions,
                    currencyVoucher:"GTQ",
                    TerminalDisplayLine1Voucher: sesion_id[0].TerminalDisplayLine1Voucher,
                    TerminalDisplayLine2Voucher: sesion_id[0].TerminalDisplayLine2Voucher,
                    TerminalDisplayLine3Voucher: sesion_id[0].TerminalDisplayLine3Voucher,
                }
                return this.impresion_reporte(response, terminal, lote, paymentlines);
            }

        }
    },
    async impresion_reporte(response, terminal, lote, paymentlines){
        var lineas_filtradas = [];
        var lineas_detalle = "";
        lineas_filtradas = (lote == "Sin Lote") ? paymentlines.filter((line) => (!line.lote)) : paymentlines.filter((line) => (line.lote == lote));
        for (var line of lineas_filtradas){
            lineas_detalle += line.pos_order_id[1].split("/")[1]+"  "+line.reference_number+"  "+line.numero_autorizacion+"  "+line.amount.toString()+" \n"+line.payment_date+"\n";
        }
        var voucher_reporte = "- - - - - -- cierre - - - - - - -\n           "+response['TerminalDisplayLine1Voucher']+"\n      "+response['TerminalDisplayLine2Voucher']+"\n            "+response['TerminalDisplayLine3Voucher']+"\n					 \nUsuario:             "+this.pos.user.name+"\nLote:                      "+lote+"\nTerminald ID:              "+terminal+"\nFECHA:"+response['hostDate'].substring(2, 4)+"/"+response['hostDate'].substring(0, 2)+"/"+response['hostDate'].substring(4, 8)+"              "+response['hostTime'].substring(0,2)+":"+response['hostTime'].substring(2, 4)+"\n\n        ***  TOTALES  ***           \nVENTAS:       "+parseInt(response['salesTransactions'])+"     "+response['currencyVoucher']+"."+parseFloat(response['salesAmount']).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })+"\nANULACIONES:  "+parseInt(response['refundsTransactions'])+"      "+response['currencyVoucher']+". -"+parseFloat(response['refundsAmount']).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })+"\n\n        ***  FORMATO  ***           \nFACT      REF      AUT      TOTAL\nFECHA  HORA\n\n        ***  DETALLE  ***\n"+lineas_detalle+"\n      ****** COMPLETO ******\n"

        await this.printer.print(
            CierreCajaReceipt,
            {
                data: voucher_reporte,
                formatCurrency: this.env.utils.formatCurrency,
            },
            { webPrintFallback: true }
        );
        return true;
    }
});