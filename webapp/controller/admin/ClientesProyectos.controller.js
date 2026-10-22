sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet", 
    "sap/ui/export/library"
], function(
	Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, Spreadsheet, exportLibrary
) {
	"use strict";
    const EdmType = exportLibrary.EdmType;

	return Controller.extend("ns.frontend.controller.admin.ClientesProyectos", {
		getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        onInit: function () {
            let  uiEstado = {
                tituloHeader: this.getResourceBundle().getText("titleClientesProyectos"),
                saludo: this.getResourceBundle().getText("saludoPanelCumplimiento") + " " + new Date().toLocaleDateString("es-MX", {
                    month: "long",
                    year: "numeric"
                })
            };

            this.getView().setModel(new JSONModel(uiEstado), "uiPantalla");

            // Modelos solo de prueba
            let oModel = this.getOwnerComponent().getModel("modeloClientes");
            this.getView().setModel(oModel, "modelo");
		},

		onBack: function() {
			this.getOwnerComponent().getRouter().navTo("RouteMain");
		},

        onSearchCliente: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            var aFilters = [];
        
            if (sQuery && sQuery.length > 0) {
                var oFilter = new Filter("nombre", FilterOperator.Contains, sQuery);
                aFilters.push(oFilter);
            }

            // Aplicamos el filtro a nuestra tabla
            var oTable = this.byId("tablaClientes");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters);
        },

        onExportarExcel: function() {
            let aCols = [
                { label: 'ID Cliente', property: 'idCliente', type: EdmType.String },
                { label: 'Nombre de la Empresa', property: 'nombre', type: EdmType.String },
                { label: 'Estatus', property: 'estatus', type: EdmType.String },
                { label: 'Total Proyectos', property: 'totalProyectos', type: EdmType.Number }
            ];

            let oRowBinding = this.byId("tablaClientes").getBinding("items");

            let oSettings = {
                workbook: { columns: aCols, hierarchyLevel: 'Level' },
                dataSource: oRowBinding,
                fileName: 'Catalogo_Clientes.xlsx',
                worker: false 
            };

            let oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(() => oSheet.destroy());
        },


        onNavToProyectos: function (oEvent) {
            // fila a la que el usuario le dio clic
            var oItem = oEvent.getSource();
            // Obtenemos el contexto (los datos) de esa fila
            var oContext = oItem.getBindingContext("modelo");
            
            // Extraemos el ID del cliente seleccionado
            var sIdCliente = oContext.getProperty("idCliente");
        
            this.getOwnerComponent().getRouter().navTo("RouteDetalleCliente", {
                clienteId: sIdCliente
            });
        },

        onNuevoCliente: function () {
            // Logica para agregar clientes (falta implementar)

            let oView = this.getView();

            if (!this._oDialogCliente) {
                sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: "ns.frontend.fragment.DialogCliente", 
                    controller: this
                }).then(function (oDialog) {
                    this._oDialogCliente = oDialog;
                    oView.addDependent(this._oDialogCliente);
                    this._oDialogCliente.unbindElement("modelo"); 
                    this._oDialogCliente.open();
                }.bind(this));
            } else {
                this._oDialogCliente.unbindElement("modelo");
                this._oDialogCliente.open();
            }
        },

        onEditarCliente: function (oEvent) {
            let oItem = oEvent.getSource();
            let oContext = oItem.getBindingContext("modelo");
            let oView = this.getView();

            if (!this._oDialogCliente) {
                sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: "ns.frontend.fragment.DialogCliente",
                    controller: this
                }).then(function (oDialog) {
                    this._oDialogCliente = oDialog;
                    oView.addDependent(this._oDialogCliente);
                    this._oDialogCliente.setBindingContext(oContext, "modelo");
                    this._oDialogCliente.open();
                }.bind(this));
            } else {
                this._oDialogCliente.setBindingContext(oContext, "modelo");
                this._oDialogCliente.open();
            }
        },

        onCerrarDialogCliente: function () {
            if (this._oDialogCliente) {
                this._oDialogCliente.close();
            }
        },

        onGuardarClienteMock: function () {
            MessageToast.show("Simulación: Cliente guardado exitosamente.");
            this.onCerrarDialogCliente();
        },

        onInactivarCliente: function (oEvent) {
            let oItem = oEvent.getSource();
            let oContext = oItem.getBindingContext("modelo");
            let oDatosFila = oContext.getObject();
            
            let sNombreCliente = oDatosFila.nombre;
            let sMensaje = "¿Estás seguro de que deseas inactivar al cliente " + sNombreCliente + "?";

            sap.m.MessageBox.confirm(sMensaje, {
                title: "Confirmar Inactivación",
                icon: sap.m.MessageBox.Icon.WARNING,
                contentWidth: "400px",
                onClose: function (sAction) {
                    if (sAction === sap.m.MessageBox.Action.OK) {
                        // Aquí irá la lógica futura para actualizar el modelo o llamar al backend
                        MessageToast.show("Simulación: Cliente " + sNombreCliente + " inactivado exitosamente.");
                    }
                }.bind(this)
            });
        }
	});
});