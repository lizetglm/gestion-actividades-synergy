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
        _abrirDialogo: async function (oContext, sTitulo) {
            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "ns.frontend.fragment.DialogCliente",
                    controller: this
                }).then((oDialog) => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }
            const oDialog = await this._pDialog;
            this._oContextDialogo = oContext;
            oDialog.setTitle(sTitulo);
            oDialog.setBindingContext(oContext);
            oDialog.open();
        },

        onCerrarDialogCliente: async function () {
            (await this._pDialog).close();
        },

        _descartarCambios: function () {
            const oModel = this.getView().getModel();
            const oContext = this._oContextDialogo;

            if (oContext && oContext.isTransient()) {
                // Creación aún no guardada: se cancela y desaparece la fila fantasma
                oContext.created()?.catch(() => {}); 
                oContext.delete().catch(() => {});
            }
            if (oModel.hasPendingChanges("grupoDialogo")) {
                // Revierte ediciones pendientes de un cliente existente
                oModel.resetChanges("grupoDialogo");
            }
        },

        // Se ejecuta al cerrar por cualquier vía (Cancelar, Guardar o ESC)
        onAfterCloseDialogo: async function () {
            const oDialog = await this._pDialog;

            this._descartarCambios();

            oDialog.setBindingContext(null);
            Fragment.byId(this.getView().getId(), "inpNombre")?.setValueState("None");
            Fragment.byId(this.getView().getId(), "inpTelefono")?.setValueState("None");
            Fragment.byId(this.getView().getId(), "inpCorreo")?.setValueState("None");
            this._oContextDialogo = null;
        },

        // Crear
        onAddCliente: function () {
            const oListBinding = this.byId("tablaClientes").getBinding("items");
            // Contexto transitorio, el POST se envía hasta el submitBatch
            const oContext = oListBinding.create({ Activo: true }, true);
            this._abrirDialogo(oContext, "Nuevo Cliente");
        },

        // Editar
        onEditCliente: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            this._abrirDialogo(oContext, "Editar Cliente");
        },

        // Guardar
        onGuardarCliente: async function () {
            const oModel = this.getView().getModel();
            const oDialog = await this._pDialog;
            const oContext = this._oContextDialogo;

            const oInpNombre = Fragment.byId(this.getView().getId(), "inpNombre");
            const oInpTelefono = Fragment.byId(this.getView().getId(), "inpTelefono");
            const oInpCorreo = Fragment.byId(this.getView().getId(), "inpCorreo");

            const sNombre = (oContext.getProperty("Nombre") || "").trim();
            const sTelefono = (oContext.getProperty("Telefono") || "").trim();
            const sCorreo = (oContext.getProperty("Correo") || "").trim();

            // Validaciones básicas
            if (!sNombre) {
                oInpNombre?.setValueState("Error");
                oInpNombre?.focus();
                oInpNombre?.setValueStateText("El nombre es obligatorio");
                return;
            }oInpNombre?.setValueState("None");

            if (!sTelefono) {
                oInpTelefono?.setValueState("Error");
                oInpTelefono?.focus();
                oInpTelefono?.setValueStateText("El teléfono es obligatorio");
                return;
            }oInpTelefono?.setValueState("None");

            if (!sCorreo) {
                oInpCorreo?.setValueState("Error");
                oInpCorreo?.focus();
                oInpCorreo?.setValueStateText("El correo es obligatorio");
                return;
            }oInpCorreo?.setValueState("None");
            

            oDialog.setBusy(true);
            try {
                await oModel.submitBatch("grupoDialogo");

                if (oModel.hasPendingChanges("grupoDialogo")) {
                    MessageBox.error("No se pudo guardar. Revisa los datos e intenta de nuevo.");
                } else {
                    MessageToast.show("Cliente guardado");
                    oDialog.close();
                }
            } catch (oError) {
                MessageBox.error(oError.message);
            } finally {
                oDialog.setBusy(false);
            }
        },


        // borrado lógico 
        onInactivarCliente: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const sNombre = oContext.getProperty("Nombre");

            MessageBox.confirm(`¿Inactivar al cliente "${sNombre}"?`, {
                onClose: async (sAccion) => {
                    if (sAccion !== MessageBox.Action.OK) { return; }
                    try {
                        // "$auto" fuerza el envío inmediato, sin esperar el grupoDialogo
                        await oContext.setProperty("Activo", false, "$auto");
                        MessageToast.show("Cliente inactivado");
                    } catch (oError) {
                        MessageBox.error(oError.message);
                    }
                }
            });
        },

    });
});