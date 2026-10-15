sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";
    return Controller.extend("com.cg.actividades.vistacalendarioactividades.controller.ReporteMensual",{
        onInit: function(){
        },
        onDownloadPDF: function(){
            sap.m.MessageToast.show("Descargando PDF del reporte...");
        },
        onSignReport: function(){
            sap.m.MessageToast.show("Reporte firmado y enviado a RR.HH. con éxito.");
        },
        onRequestReopen: function(){
            sap.m.MessageToast.show("Solicitud de reapertura enviada.");
        }
    });
});