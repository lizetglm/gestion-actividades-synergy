sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/export/Spreadsheet", 
    "sap/ui/export/library",
    "ns/frontend/util/ExportHelper"
], function (
    Controller, Fragment, JSONModel, MessageToast, MessageBox, 
    Spreadsheet, exportLibrary, ExportHelper
) {
    "use strict";
    const EdmType = exportLibrary.EdmType;

    return Controller.extend("ns.frontend.controller.admin.Clientes", {

        // --- NAVEGACIÓN (LEER) ---
        onSelectCliente: function (oEvent) {
            var oItem = oEvent.getSource(); 
            var sPath = oItem.getBindingContext("mock").getPath();
            var sIndex = sPath.split("/").pop();
            
            this.getOwnerComponent().getRouter().navTo("RouteProyectos", { clientIndex: sIndex });
        },

        onNavBackToMain: function () {
            this.getOwnerComponent().getRouter().navTo("RouteMain");
        },

        onExportarExcel: function () {
            let aCols = [
                { label: 'ID Cliente', property: 'idCliente', type: EdmType.String },
                { label: 'Nombre del Cliente', property: 'nombre', type: EdmType.String },
                { label: 'Proyectos Asignados', property: 'totalProyectos', type: EdmType.String },
                { label: 'Estatus', property: 'estatus', type: EdmType.String }
            ];

            let oRowBinding = this.byId("tablaClientes").getBinding("items"); 
			let sNombreArchivo = ExportHelper.generarNombreArchivoConFecha("Portafolio_Clientes");
            let oSettings = {
                workbook: { columns: aCols },
                dataSource: oRowBinding,
                fileName: sNombreArchivo, 
                worker: false
            };

            let oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(() => oSheet.destroy());
        },


        // CRUD --------------------------------------------------
        onAddCliente: function () {
            this._modoEdicion = false;
            this._abrirDialogoCliente();
        },

        onEditCliente: function (oEvent) {
            this._modoEdicion = true;
            // Guardamos el path exacto (ej. /clientes/0) del elemento al que le dimos clic
            var oItem = oEvent.getSource();
            this._sEditPath = oItem.getBindingContext("mock").getPath();
            var oDatosActuales = oItem.getBindingContext("mock").getObject();
            
            this._abrirDialogoCliente(oDatosActuales);
        },

        _abrirDialogoCliente: function (oDatosExistentes) {
            var oView = this.getView();

            // Si es edición, clonamos los datos para no modificar la vista hasta dar clic en Guardar.
            // Si es nuevo, creamos un objeto vacío.
            var oDatos = oDatosExistentes ? JSON.parse(JSON.stringify(oDatosExistentes)) : {
                idCliente: "", nombre: "", estatus: "Activo", totalProyectos: 0, proyectos: [], consultores: []
            };

            if (!this._oDialogCliente) {
                Fragment.load({
                    id: oView.getId(),
                    name: "ns.frontend.fragment.DialogCliente", 
                    controller: this
                }).then(function (oDialog) {
                    this._oDialogCliente = oDialog;
                    oView.addDependent(this._oDialogCliente);
                    this._setearModeloYAbrir(oDatos);
                }.bind(this));
            } else {
                this._setearModeloYAbrir(oDatos);
            }
        },

        _setearModeloYAbrir: function (oDatos) {
            var oModelDialog = new JSONModel(oDatos);
            this._oDialogCliente.setModel(oModelDialog, "modelo");
            this._oDialogCliente.open();
        },

        onGuardarClienteMock: function () {
            var oDatosFormulario = this._oDialogCliente.getModel("modelo").getData();
            var oModelMain = this.getView().getModel("mock");

            // Validar que no vengan vacíos
            if (!oDatosFormulario.idCliente || !oDatosFormulario.nombre) {
                MessageToast.show("El ID y el Nombre son obligatorios");
                return;
            }

            if (this._modoEdicion) {
                // Actualizar el cliente existente
                oModelMain.setProperty(this._sEditPath, oDatosFormulario);
                MessageToast.show("Cliente actualizado correctamente");
            } else {
                // Agregar un nuevo cliente al arreglo
                var aClientes = oModelMain.getProperty("/clientes") || [];
                aClientes.push(oDatosFormulario);
                oModelMain.setProperty("/clientes", aClientes);
                MessageToast.show("Nuevo cliente creado");
            }

            this._oDialogCliente.close();
        },

        onCerrarDialogCliente: function () {
            if (this._oDialogCliente) {
                this._oDialogCliente.close();
            }
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
        },

        onDeleteCliente: function (oEvent) {
            var oList = this.byId("listaClientes");
            var oItem = oEvent.getParameter("listItem");
            var sPath = oItem.getBindingContext("mock").getPath();
            var oModel = this.getView().getModel("mock");

            MessageBox.confirm("¿Estás seguro de que deseas eliminar este cliente y todos sus proyectos?", {
                title: "Confirmar Eliminación",
                icon: MessageBox.Icon.WARNING,
                actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.DELETE) {
                        // Extraer el índice de la ruta (ej: /clientes/1 -> 1)
                        var aPathParts = sPath.split("/");
                        var iIndex = parseInt(aPathParts[aPathParts.length - 1], 10);
                        
                        var aClientes = oModel.getProperty("/clientes");
                        aClientes.splice(iIndex, 1); // Elimina 1 elemento del arreglo
                        
                        oModel.setProperty("/clientes", aClientes);
                        MessageToast.show("Cliente eliminado");
                    }
                    oList.swipeOut(); // Esconde el botón de swipe
                }
            });
        }
    });
});