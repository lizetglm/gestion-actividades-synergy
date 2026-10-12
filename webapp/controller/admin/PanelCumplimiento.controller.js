sap.ui.define([
	"sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function(
	Controller, JSONModel
) {
	"use strict";

	return Controller.extend("ns.frontend.controller.admin.PanelCumplimiento", {
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        onInit: function () {
            let  uiEstado = {
                tituloHeader: this.getResourceBundle().getText("titlePanelCumplimiento"),
                saludo: this.getResourceBundle().getText("saludoPanelCumplimiento") + " " + new Date().toLocaleDateString("es-MX", {
                    month: "long",
                    year: "numeric"
                }),
                kpis: {
                    activos: 0,
                    completos: 0,
                    pendientes: 0,
                    sinFirmar: 0
                }
            };

            this.getView().setModel(new JSONModel(uiEstado), "uiPantalla");

            let oModelo = [
                { 
                    nombre: "Juan Pérez", cliente: "Cliente A", equipo: "Equipo 1", estatusReg: "Activo", estatusFirma: "Firmado"
                },
                { 
                    nombre: "María López", cliente: "Cliente B", equipo: "Equipo 2", estatusReg: "Pendiente", estatusFirma: "Sin firmar"
                },
                { 
                    nombre: "Carlos García", cliente: "Cliente C", equipo: "Equipo 1", estatusReg: "Activo", estatusFirma: "Firmado"
                },
                { 
                    nombre: "Ana Torres", cliente: "Cliente D", equipo: "Equipo 3", estatusReg: "Pendiente", estatusFirma: "Firmado"
                },
                { 
                    nombre: "Ana Torres", cliente: "Cliente D", equipo: "Equipo 3", estatusReg: "n/a", estatusFirma: "N/a"
                },{ 
                    nombre: "Juan Pérez", cliente: "Cliente A", equipo: "Equipo 1", estatusReg: "Activo", estatusFirma: "Firmado"
                },
                { 
                    nombre: "María López", cliente: "Cliente B", equipo: "Equipo 2", estatusReg: "Pendiente", estatusFirma: "Sin firmar"
                },
                { 
                    nombre: "Carlos García", cliente: "Cliente C", equipo: "Equipo 1", estatusReg: "Activo", estatusFirma: "Firmado"
                },
                { 
                    nombre: "Ana Torres", cliente: "Cliente D", equipo: "Equipo 3", estatusReg: "Pendiente", estatusFirma: "Firmado"
                },
                { 
                    nombre: "Ana Torres", cliente: "Cliente D", equipo: "Equipo 3", estatusReg: "n/a", estatusFirma: "N/a"
                },{ 
                    nombre: "Juan Pérez", cliente: "Cliente A", equipo: "Equipo 1", estatusReg: "Activo", estatusFirma: "Firmado"
                },
                { 
                    nombre: "María López", cliente: "Cliente B", equipo: "Equipo 2", estatusReg: "Pendiente", estatusFirma: "Sin firmar"
                },
                { 
                    nombre: "Carlos García", cliente: "Cliente C", equipo: "Equipo 1", estatusReg: "Activo", estatusFirma: "Firmado"
                }
            ];
            this.getView().setModel(new JSONModel(oModelo), "modelo");
        },

        onBack: function() {
			this.getOwnerComponent().getRouter().navTo("RouteMain");
		}
	});
});