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
            var oContext = oItem.getBindingContext();
            var sClientUuid = oContext.getProperty("ClientUuid");
            
            this.getOwnerComponent().getRouter().navTo("RouteProyectos", { clientUuid: sClientUuid });
        },

        onBack: function() {
            this.getOwnerComponent().getRouter().navTo("RouteMain");
        },

        onExportarExcel: function () {
            let aCols = [
                { label: 'ID Cliente', property: 'ClientUuid', type: EdmType.String },
                { label: 'Nombre del Cliente', property: 'Nombre', type: EdmType.String },
                { label: 'Correo', property: 'Correo', type: EdmType.String },
                { label: 'Estatus', property: 'Activo', type: EdmType.String }
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

        // --- CRUD OPERACIONES ---

        

        // 1. CREAR
        onAddCliente: function () {
            var oListBinding = this.byId("tablaClientes").getBinding("items");
            
            // Creamos un contexto transitorio directo en OData v4
            var oNewContext = oListBinding.create({
                "Nombre": "",
                "Telefono": "",
                "Correo": "",
                "Activo": "X"
            }, true); // expand/transient

            this._oActiveContext = oNewContext;
            this._isEditMode = false;
            this._abrirDialogoCliente(oNewContext);
        },

        // 2. EDITAR
        onEditCliente: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            this._oActiveContext = oContext;
            this._isEditMode = true;
            this._abrirDialogoCliente(oContext);
        },

        // 3. GUARDAR
        onGuardarCliente: function () {
            var oModel = this.getView().getModel();
            var oDialog = this.byId("dialogGestionarCliente");

            // Validar campos requeridos
            var sNombre = this._oActiveContext.getProperty("Nombre");
            if (!sNombre || sNombre.trim() === "") {
                MessageToast.show("El nombre del cliente es obligatorio.");
                return;
            }

            oDialog.setBusy(true);

            if (this._isEditMode) {
                // Sincronizar cambios pendientes de actualización
                oModel.submitBatch("$auto").then(function () {
                    oDialog.setBusy(false);
                    MessageToast.show("Cliente actualizado correctamente.");
                    this.onCerrarDialogCliente();
                }.bind(this)).catch(function (oError) {
                    oDialog.setBusy(false);
                    MessageBox.error("Error al actualizar cliente: " + oError.message);
                }.bind(this));
            } else {
                // Confirmar la creación del contexto transitorio
                this._oActiveContext.created().then(function () {
                    oDialog.setBusy(false);
                    MessageToast.show("Cliente creado exitosamente.");
                    this.onCerrarDialogCliente();
                }.bind(this)).catch(function (oError) {
                    oDialog.setBusy(false);
                    if (this._oActiveContext) {
                        this._oActiveContext.delete("$auto");
                    }
                    MessageBox.error("Error al crear el cliente: " + oError.message);
                }.bind(this));

                // Disparar envío del batch
                oModel.submitBatch("$auto");
            }
        },

        // 4. CANCELAR / CERRAR DIÁLOGO
        onCerrarDialogCliente: function () {
            var oModel = this.getView().getModel();
            
            // Si estábamos creando y cancelamos, eliminamos el contexto sin guardar
            if (!this._isEditMode && this._oActiveContext && this._oActiveContext.isTransient()) {
                this._oActiveContext.delete("$auto");
            } else if (this._isEditMode && oModel.hasPendingChanges()) {
                // Revertir cambios locales si cancelamos en modo edición
                oModel.resetChanges();
            }

            this._oActiveContext = null;
            this.byId("dialogGestionarCliente").close();
        },

        // 5. INACTIVAR / ELIMINAR
        onInactivarCliente: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();

            MessageBox.confirm("¿Estás seguro de que deseas eliminar este cliente y sus datos asociados?", {
                title: "Confirmar Eliminación",
                icon: MessageBox.Icon.WARNING,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        oContext.delete().then(function () {
                            MessageToast.show("Cliente eliminado correctamente.");
                        }).catch(function (oError) {
                            MessageBox.error("Error al eliminar: " + oError.message);
                        });
                    }
                }
            });
        },

        // --- GESTIÓN DEL FRAGMENTO ---
        _abrirDialogoCliente: function (oContext) {
            var oView = this.getView();

            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: oView.getId(),
                    name: "ns.frontend.fragment.DialogCliente",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pDialog.then(function (oDialog) {
                // Asignar directamente el Contexto OData v4 al Diálogo
                oDialog.setBindingContext(oContext);
                oDialog.open();
            });
        }

    });
});