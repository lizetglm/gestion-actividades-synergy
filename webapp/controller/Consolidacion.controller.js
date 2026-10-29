sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/export/Spreadsheet", 
    "sap/ui/export/library",
	"ns/frontend/util/ExportHelper"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, Fragment,
    Spreadsheet, exportLibrary, ExportHelper
) {
    "use strict";
    const EdmType = exportLibrary.EdmType;

	return Controller.extend("ns.frontend.controller.Consolidacion", {
        onInit: function () {
            // Modelos de prueba (borrar después)
            var oData = {
                reports: [
                    {
                        Cliente: "Alpha S.A. de C.V.",
                        Proyecto: "Implementación SAP BTP",
                        Month: "Octubre 2026",
                        Headcount: 12,
                        TotalHours: "1,920",
                        StatusText: "Listo para envío",
                        StatusState: "Success"
                    },
                    {
                        Cliente: "Beta Tech Solutions",
                        Proyecto: "Integración API Gateway",
                        Month: "Octubre 2026",
                        Headcount: 4,
                        TotalHours: "640",
                        StatusText: "Pendiente firmas (1/4)",
                        StatusState: "Warning"
                    },
                    {
                        Cliente: "Alpha S.A. de C.V.",
                        Proyecto: "Implementación SAP BTP",
                        Month: "Septiembre 2026",
                        Headcount: 12,
                        TotalHours: "1,920",
                        StatusText: "Enviado al Cliente",
                        StatusState: "Information"
                    },
                    {
                        Cliente: "Gamma Logistics",
                        Proyecto: "Soporte AMS",
                        Month: "Octubre 2026",
                        Headcount: 2,
                        TotalHours: "320",
                        StatusText: "Listo para envío",
                        StatusState: "Success"
                    }
                ]
            };

            this.getView().setModel(new JSONModel(oData), "consolidacionModel");
            this.getView().setModel(new JSONModel({ period: "All", status: "All" }), "filterModel");
        },

        onBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteMain");
        },



        // Selección 
        onSelectionChange: function () {
            var oTable = this.byId("consolidacionTable");
            var iSelectedCount = oTable.getSelectedItems().length;
            var oText = this.byId("mensajeFooterText");

            if (iSelectedCount > 0) {
                oText.setText(iSelectedCount + " paquete(s) consolidado(s) listo(s) para procesar.");
            } else {
                oText.setText("Selecciona los paquetes consolidados a enviar.");
            }
        },

        // Filtros 
        onExecuteFilter: function () {
            var oTable = this.byId("consolidacionTable");
            var oBinding = oTable.getBinding("items");
            var sPeriod = this.byId("periodComboBox").getSelectedKey();
            var sStatus = this.byId("statusComboBox").getSelectedKey();
            var aFilters = [];

            if (sPeriod !== "All") {
                var sMonth = (sPeriod === "Sep2026") ? "Septiembre 2026" : "Octubre 2026";
                aFilters.push(new Filter("Month", FilterOperator.EQ, sMonth));
            }

            if (sStatus !== "All") {
                // Filtro aproximado (Contains) para capturar los textos variables como "Pendiente firmas (1/4)"
                var sStatusText = (sStatus === "Ready") ? "Listo" : "Pendiente";
                aFilters.push(new Filter("StatusText", FilterOperator.Contains, sStatusText));
            }

            oBinding.filter(aFilters);
            oTable.removeSelections(true);
            this.onSelectionChange();
        },


        // Funciones de la tabla
         onExportarExcel: function () {
            let aCols = [
                { label: 'Cliente', property: 'Cliente', type: EdmType.String },
                { label: 'Proyecto', property: 'Proyecto', type: EdmType.String },
                { label: 'Periodo', property: 'Month', type: EdmType.String },
                { label: 'Headcount', property: 'Headcount', type: EdmType.String },
                { label: 'Total Horas', property: 'TotalHours', type: EdmType.String },
                { label: 'Estatus de Envío', property: 'StatusText', type: EdmType.String }
			];

			let oRowBinding = this.byId("consolidacionTable").getBinding("items");
			let sNombreArchivo = ExportHelper.generarNombreArchivoConFecha("Reporte_Consolidacion");
            let oSettings = {
                workbook: { columns: aCols },
                dataSource: oRowBinding,
                fileName: sNombreArchivo, 
                worker: false
            };

			let oSheet = new Spreadsheet(oSettings);
			oSheet.build().finally(() => oSheet.destroy());
        },

        onAbrirOrdenamiento: function (oEvent) {
            var oView = this.getView();

            if (!this._pDialogOrdenamiento) {
                this._pDialogOrdenamiento = Fragment.load({
                    id: oView.getId(),
                    name: "ns.frontend.fragment.DialogOrdConsolidacion",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pDialogOrdenamiento.then(function (oDialog) {
                oDialog.open();
            });
        },

        onConfirmarOrdenamiento: function (oEvent) {
            var oTable = this.byId("consolidacionTable");
            var oBinding = oTable.getBinding("items");
            
            var mParams = oEvent.getParameters();
            var sPath = mParams.sortItem.getKey();
            var bDescending = mParams.sortDescending;
            
            // regla de ordenamiento en el binding de la tabla
            var aSorters = [];
            aSorters.push(new sap.ui.model.Sorter(sPath, bDescending));
            
            oBinding.sort(aSorters);
        },



        // Lógica UC-15: Enviar a Aprobación -------------------
        onSendForApproval: function () {
            var oTable = this.byId("consolidacionTable");
            var aSelectedItems = oTable.getSelectedItems();

            if (aSelectedItems.length === 0) {
                MessageBox.information("Seleccione al menos un paquete para enviar.");
                return;
            }

            // validacion de estatus de los paquetes seleccionados
            var bIncompleto = false;
            aSelectedItems.forEach(function(oItem) {
                var sState = oItem.getBindingContext("consolidacionModel").getProperty("StatusState");
                if (sState === "Warning" || sState === "None") {
                    bIncompleto = true;
                }
            });

            if (bIncompleto) {
                MessageBox.error("No se puede enviar. Uno o más de los paquetes seleccionados tienen reportes de consultores sin firmar.");
                return;
            }

            // Simulación de envío exitoso
            MessageBox.success("¡Paquete consolidado enviado con éxito al cliente!", {
                title: "Envío Confirmado",
                onClose: function () {
                    oTable.removeSelections(true);
                    this.onSelectionChange();
                }.bind(this)
            });
        },

        onSaveDraft: function () {
            MessageToast.show("Borrador guardado localmente.");
        },

        onCancel: function () {
            var oTable = this.byId("consolidacionTable");
            oTable.removeSelections(true);
            this.onSelectionChange();
            MessageToast.show("Selección cancelada.");
        },



        // LÓGICA DE DETALLE DEL PAQUETE (VISOR PDF)
        onVerDetallePaquete: function (oEvent) {
            var oView = this.getView();
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext("consolidacionModel");
            var oDatosFila = oContext.getObject();

            // Generar datos simulados de los consultores dependiendo del estatus del paquete
            var aConsultoresMock = [];
            if (oDatosFila.StatusState === "Success" || oDatosFila.StatusState === "Information") {
                aConsultoresMock = [
                    { nombre: "Lizet López", estatusTexto: "Firmado", estatusEstado: "Success" },
                    { nombre: "Jesús Rosiles", estatusTexto: "Firmado", estatusEstado: "Success" }
                ];
            } else {
                aConsultoresMock = [
                    { nombre: "Juan Pérez", estatusTexto: "Firmado", estatusEstado: "Success" },
                    { nombre: "María González", estatusTexto: "Pendiente de firma", estatusEstado: "Error" }
                ];
            }

            var oModeloDetalle = new JSONModel({
                Cliente: oDatosFila.Cliente,
                Proyecto: oDatosFila.Proyecto,
                consultores: aConsultoresMock
            });

            // Cargar y abrir el Fragmento
            if (!this._pDialogDetallePaquete) {
                this._pDialogDetallePaquete = sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: "ns.frontend.fragment.DialogDetallePaquete",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pDialogDetallePaquete.then(function (oDialog) {
                oDialog.setModel(oModeloDetalle, "detallePaquete");
                oDialog.open();
            });
        },

        onCerrarDetallePaquete: function () {
            if (this._pDialogDetallePaquete) {
                this._pDialogDetallePaquete.then(function(oDialog) {
                    oDialog.close();
                });
            }
        },

        onVerPDFConsultor: function (oEvent) {
            var oItem = oEvent.getSource();
            var sNombre = oItem.getBindingContext("detallePaquete").getProperty("nombre");
            
            // Simulación de descarga/visualización
            MessageBox.information("Abriendo el archivo PDF firmado oficialmente por " + sNombre + " desde el repositorio documental de SAP BTP.");
        }
	});
});