sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    const MAPEO = {
        dailyHourLimit: "LIMITE_HORAS_DIARIAS",
        weeklyOvertime: "UMBRAL_HORAS_SEMANALES",
        submissionThreshold: "UMBRAL_REGISTRO_HORAS",
        closingDay: "DIA_CIERRE_MENSUAL",
        gracePeriod: "PERIODO_GRACIA_DIAS",
        approvalLimit: "LIMITE_APROBACION_DIAS",
        emailNotifications: "NOTIFICACIONES_CORREO",
        managerEscalations: "ESCALAMIENTO_RESPONSABLE",
        weeklyReports: "REPORTES_SEMANALES",

        pendingDaysPolicy: "POLITICA_DIAS_PENDIENTES",
        automaticPdf: "GENERACION_AUTOMATICA_PDF",
        allowRegeneration: "PERMITIR_REGENERACION",
        pdfTemplate: "PLANTILLA_PDF",
        signatureMethod: "METODO_FIRMA",
        reminderFrequency: "FRECUENCIA_RECORDATORIOS",
        notificationChannel: "CANAL_NOTIFICACION"
    };

    const BOOLEANOS = [
        "emailNotifications",
        "managerEscalations",
        "weeklyReports",
        "automaticPdf",
        "allowRegeneration"
    ];

    const NUMERICOS = [
        "dailyHourLimit",
        "weeklyOvertime",
        "submissionThreshold",
        "closingDay",
        "gracePeriod",
        "approvalLimit",
        "reminderFrequency"
    ];

    const PREDETERMINADOS = {
        dailyHourLimit: 8,
        weeklyOvertime: 40,
        submissionThreshold: 24,
        closingDay: "05",
        gracePeriod: 3,
        approvalLimit: 5,
        emailNotifications: true,
        managerEscalations: true,
        weeklyReports: false,
        pendingDaysPolicy: "BLOQUEAR",
        automaticPdf: true,
        allowRegeneration: false,
        pdfTemplate: "DEFAULT",
        signatureMethod: "SIMPLE",
        reminderFrequency: 3,
        notificationChannel: "EMAIL"
    };

    return Controller.extend(
        "ns.frontend.controller.admin.Configuracion", {

        onInit: function () {
            this._defaultSettings = PREDETERMINADOS;
            this._savedSettings = {};
            this._contextos = {};
            this._bindingConfig = null;
            this._guardando = false;
            this._cargado = false;

            this.getView().setModel(
                new JSONModel({}),
                "settings"
            );

            this.cargarConfiguraciones();
        },

        _obtenerOData: function () {
            return this.getOwnerComponent().getModel();
        },

        _convertirSAP: function (sCampo, vValor) {
            if (BOOLEANOS.includes(sCampo)) {
                return vValor ? "X" : "";
            }

            if (sCampo === "closingDay") {
                return String(Number(vValor)).padStart(2, "0");
            }

            return String(vValor).trim();
        },

        cargarConfiguraciones: async function () {
            const oView = this.getView();
            oView.setBusy(true);
            this._cargado = false;

            try {
                const oOData = this._obtenerOData();

                if (this._bindingConfig) {
                    this._bindingConfig.destroy();
                }


                this._bindingConfig = oOData.bindList(
                    "/Configuraciones",
                    undefined,
                    undefined,
                    undefined,
                    {
                        $$groupId: "$direct",
                        $$updateGroupId: "configCambios"
                    }
                );


                const aContextos =
                    await this._bindingConfig.requestContexts(0, 100);

                const aRegistros = await Promise.all(
                    aContextos.map(o => o.requestObject())
                );

                const oRegistros = {};
                this._contextos = {};

                aRegistros.forEach((oRegistro, i) => {
                    oRegistros[oRegistro.ClaveParametro] =
                        oRegistro;

                    this._contextos[oRegistro.ClaveParametro] =
                        aContextos[i];
                });

                const oSettings = {};

                Object.keys(MAPEO).forEach(sCampo => {
                    const sClave = MAPEO[sCampo];
                    const oRegistro = oRegistros[sClave];

                    if (!oRegistro) {
                        throw new Error(
                            "Falta el parámetro SAP: " + sClave
                        );
                    }

                    if (BOOLEANOS.includes(sCampo)) {
                        oSettings[sCampo] =
                            oRegistro.Valor === "X";

                    } else if (sCampo === "closingDay") {
                        oSettings[sCampo] =
                            String(oRegistro.Valor).padStart(2, "0");

                    } else if (NUMERICOS.includes(sCampo)) {
                        oSettings[sCampo] =
                            Number(oRegistro.Valor);

                    } else {
                        oSettings[sCampo] =
                            String(oRegistro.Valor || "");
                    }
                });

                this._savedSettings =
                    JSON.parse(JSON.stringify(oSettings));

                oView.getModel("settings").setData(oSettings);

                this._cargado = true;

                console.log(
                    "Parámetros SAP cargados:",
                    aRegistros.length
                );

            } catch (oError) {
                console.error(oError);

                MessageBox.error(
                    "Error al cargar configuraciones: " +
                    oError.message
                );

            } finally {
                oView.setBusy(false);
            }
        },

        _validar: function (oDatos) {
            NUMERICOS.forEach(sCampo => {
                const vValor = oDatos[sCampo];
                const nValor = Number(vValor);

                if (
                    vValor === "" ||
                    vValor === null ||
                    vValor === undefined ||
                    !Number.isFinite(nValor) ||
                    !Number.isInteger(nValor) ||
                    nValor < 0
                ) {
                    throw new Error(
                        "Valor numérico inválido: " + sCampo
                    );
                }
            });

            const nDia = Number(oDatos.closingDay);

            if (nDia < 1 || nDia > 31) {
                throw new Error(
                    "El día de cierre debe estar entre 1 y 31."
                );
            }

            if (Number(oDatos.approvalLimit) < 1) {
                throw new Error(
                    "El plazo de aprobación debe ser mayor que cero."
                );
            }

            if (Number(oDatos.reminderFrequency) < 1) {
                throw new Error(
                    "La frecuencia de recordatorios debe ser mayor que cero."
                );
            }

            if (
                !["BLOQUEAR", "ADVERTIR"].includes(
                    oDatos.pendingDaysPolicy
                )
            ) {
                throw new Error(
                    "Política de días pendientes inválida."
                );
            }

            [
                "pdfTemplate",
                "signatureMethod",
                "notificationChannel"
            ].forEach(sCampo => {
                if (
                    !String(oDatos[sCampo] || "").trim()
                ) {
                    throw new Error(
                        "El campo " + sCampo + " es obligatorio."
                    );
                }
            });
        },


        onSave: async function () {

            if (this._guardando || !this._cargado) {
                return;
            }

            const oView = this.getView();
            const oModeloSettings = oView.getModel("settings");
            const oDatos = oModeloSettings.getData();
            const oOData = this._obtenerOData();
            const sGrupo = "configCambios";

            try {
                this._validar(oDatos);
            } catch (oError) {
                MessageBox.warning(oError.message);
                return;
            }

            const aCambios = Object.keys(MAPEO).filter(sCampo =>
                this._convertirSAP(
                    sCampo,
                    oDatos[sCampo]
                ) !== this._convertirSAP(
                    sCampo,
                    this._savedSettings[sCampo]
                )
            );

            if (aCambios.length === 0) {
                MessageToast.show("No hay cambios para guardar.");
                return;
            }

            // Conservar los valores que queremos guardar
            // antes de recargar el modelo.
            const oValoresEsperados = {};

            aCambios.forEach(sCampo => {
                oValoresEsperados[sCampo] =
                    this._convertirSAP(
                        sCampo,
                        oDatos[sCampo]
                    );
            });

            this._guardando = true;
            oView.setBusy(true);

            try {

                const aActualizaciones = [];

                // Preparar las modificaciones OData
                aCambios.forEach(sCampo => {

                    const sClave = MAPEO[sCampo];
                    const oContexto = this._contextos[sClave];

                    if (!oContexto) {
                        throw new Error(
                            "No existe el contexto de " + sClave
                        );
                    }

                    const pActualizacion = oContexto.setProperty(
                        "Valor",
                        oValoresEsperados[sCampo],
                        sGrupo
                    );

                    aActualizaciones.push(pActualizacion);

                });

                console.log(
                    "Enviando modificaciones SAP:",
                    aCambios
                );
                await oOData.submitBatch(sGrupo);

                const aResultados = await Promise.allSettled(
                    aActualizaciones
                );

                const aErrores = aResultados.filter(
                    oResultado => oResultado.status === "rejected"
                );

                if (aErrores.length > 0) {
                    throw new Error(
                        "SAP rechazó una o más actualizaciones: " +
                        aErrores.map(oError =>
                            String(oError.reason?.message || oError.reason)
                        ).join("; ")
                    );
                }

                if (oOData.hasPendingChanges(sGrupo)) {
                    throw new Error(
                        "SAP mantiene modificaciones pendientes."
                    );
                }

                // Recargar los valores reales de SAP
                await this.cargarConfiguraciones();

                if (!this._cargado) {
                    throw new Error(
                        "No fue posible recargar los parámetros desde SAP."
                    );
                }

                const oActual = oModeloSettings.getData();
                const aDiferencias = aCambios.filter(sCampo =>
                    this._convertirSAP(
                        sCampo,
                        oActual[sCampo]
                    ) !== oValoresEsperados[sCampo]
                );

                if (aDiferencias.length > 0) {
                    throw new Error(
                        "SAP no confirmó los valores: " +
                        aDiferencias.join(", ")
                    );
                }

                MessageToast.show(
                    "Los parámetros se guardaron correctamente en SAP."
                );

            } catch (oError) {

                console.error(
                    "Error al actualizar parámetros:",
                    oError
                );

                MessageBox.error(
                    "No se pudo confirmar el guardado: " +
                    oError.message
                );

            } finally {

                this._guardando = false;
                oView.setBusy(false);

            }
        },


        onCancel: function () {
            if (!this._cargado || this._guardando) {
                return;
            }

            this.getView().getModel("settings").setData(
                JSON.parse(JSON.stringify(this._savedSettings))
            );

            MessageToast.show("Cambios descartados.");
        },

        onReset: function () {
            if (!this._cargado || this._guardando) {
                return;
            }

            this.getView().getModel("settings").setData(
                JSON.parse(JSON.stringify(this._defaultSettings))
            );

            MessageToast.show(
                "Valores predeterminados cargados. " +
                "Presiona Guardar para aplicarlos."
            );
        },

        onBack: function () {
            window.history.back();
        },

        onHome: function () {
            this.getOwnerComponent()
                .getRouter()
                .navTo("RouteMain");
        },

        onExit: function () {
            if (this._bindingConfig) {
                this._bindingConfig.destroy();
                this._bindingConfig = null;
            }
        }

    });
});
