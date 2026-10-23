sap.ui.define([
	"sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment"
], function(
	Controller, JSONModel, MessageBox, MessageToast, Fragment
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
            
            // Modelos solo de prueba
            var oModel = new JSONModel("model/panelCumplimiento.json");
            this.getView().setModel(oModel, "modelo");
        },

        onBack: function() {
			this.getOwnerComponent().getRouter().navTo("RouteMain");
		},

        onConsolidarMasivo: function () {
            let oTable = this.byId("tablaCumplimiento");
            // Obtenemos un arreglo con todas las filas que el usuario palomeó
            let aContexts = oTable.getSelectedContexts(); 

            if (aContexts.length === 0) {
                MessageBox.warning("Por favor, selecciona al menos un consultor para consolidar.");
                return;
            }

            MessageBox.confirm("¿Estás seguro de consolidar y enviar el reporte de los " + aContexts.length + " consultores seleccionados?", {
                title: "Confirmar Consolidación",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        MessageToast.show("Simulación: Reportes consolidados y enviados exitosamente.");
                        oTable.removeSelections(); // Limpiar las palomitas
                    }
                }
            });
        },

        onRechazarMasivo: function () {
            let oTable = this.byId("tablaCumplimiento");
            let aContexts = oTable.getSelectedContexts();

            if (aContexts.length === 0) {
                MessageBox.warning("Por favor, selecciona al menos un consultor para rechazar.");
                return;
            }

            let oView = this.getView();

            if (!this._oDialogRechazo) {
                Fragment.load({
                    id: oView.getId(),
                    name: "ns.frontend.fragment.DialogRechazo",
                    controller: this
                }).then(function (oDialog) {
                    this._oDialogRechazo = oDialog;
                    oView.addDependent(this._oDialogRechazo);
                    this._oDialogRechazo.open();
                }.bind(this));
            } else {
                this.byId("txtMotivoRechazo").setValue(""); 
                this._oDialogRechazo.open();
            }
        },

        onConfirmarRechazo: function () {
            let sMotivo = this.byId("txtMotivoRechazo").getValue();
            
            // Validación del campo obligatorio (RF-14)
            if (!sMotivo || sMotivo.trim() === "") {
                MessageBox.error("El motivo de rechazo es obligatorio.");
                return;
            }

            MessageToast.show("Simulación: Reportes rechazados. Se ha notificado a los consultores.");
            this.byId("tablaCumplimiento").removeSelections();
            this.onCerrarDialogRechazo();
        },

        onCerrarDialogRechazo: function () {
            if (this._oDialogRechazo) {
                this._oDialogRechazo.close();
            }
        }
	});
});