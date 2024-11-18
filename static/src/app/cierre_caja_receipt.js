/** @odoo-module **/

import { Component } from "@odoo/owl";
import { ReceiptHeader } from "@point_of_sale/app/screens/receipt_screen/receipt/receipt_header/receipt_header";
import { omit } from "@web/core/utils/objects";

export class CierreCajaReceipt extends Component {
    static template = "pos_credomatic.CierreCajaReceipt";
    static components = {
        ReceiptHeader,
    };
    static props = {
        data: Objectgit a,
        formatCurrency: Function,
    };
    omit(...args) {
        return omit(...args);
    }
}