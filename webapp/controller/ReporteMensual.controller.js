sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    MessageBox,
    MessageToast
) {
    "use strict";

    return Controller.extend("ns.frontend.controller.ReporteMensual", {

        getResourceBundle: function () {
            return this.getOwnerComponent()
                .getModel("i18n")
                .getResourceBundle();
        },

        onInit: function () {
            const oUI = new JSONModel({
                tituloHeader: this.getResourceBundle()
                    .getText("titleReporteMensual"),
                saludo: this.getResourceBundle()
                    .getText("saludoReporteMensual")
            });

            this.getView().setModel(oUI, "uiPantalla");

            const oReporte = new JSONModel({
                ReporteUuid: "",
                ConsultorUuid: "",
                NombreConsultor: "",
                Anio: "",
                Mes: "",
                NombreMes: "",
                TotalHoras: 0,
                Estado: "",
                EstadoTexto: "Sin reporte seleccionado",
                EstadoColor: "None",
                PeriodoTexto: "",
                InformacionConsultor: "",
                TotalHorasTexto: "",
                FechaGeneracion: "",
                TienePDF: false,
                Actividades: []
            });

            this.getView().setModel(
                oReporte,
                "reporteSeleccionado"
            );

            const oRouter = this.getOwnerComponent().getRouter();

            oRouter.getRoute("RouteReporteMensual")
                .attachPatternMatched(
                    this._onRouteMatched,
                    this
                );
        },

        _onRouteMatched: async function () {
            await this.cargarReporte();
        },

        onBack: function () {
            this.getOwnerComponent()
                .getRouter()
                .navTo("RouteMain");
        },

        obtenerNombreMes: function (sMes) {
            const aMeses = [
                "Enero", "Febrero", "Marzo",
                "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre",
                "Octubre", "Noviembre", "Diciembre"
            ];

            return aMeses[Number(sMes) - 1] ||
                "Desconocido";
        },

        cargarReporte: async function () {
            const oVista = this.getView();
            const oModelo = this.getOwnerComponent()
                .getModel("actividadesOData");

            oVista.setBusy(true);

            try {
                if (!oModelo) {
                    throw new Error(
                        "No se encontró el modelo actividadesOData."
                    );
                }

                // Consulta solo datos generales, sin PDF.
                const oBinding = oModelo.bindList(
                    "/Reportes",
                    undefined,
                    undefined,
                    [
                        new Filter(
                            "Estado",
                            FilterOperator.EQ,
                            "G"
                        )
                    ],
                    {
                        $select:
                            "ReporteUuid,ConsultorUuid," +
                            "NombreConsultor,Anio,Mes," +
                            "TotalHoras,Estado,FechaGeneracion"
                    }
                );

                // Dos registros bastan para comprobar
                // si existe una selección inequívoca.
                const aContexts =
                    await oBinding.requestContexts(0, 2);

                if (aContexts.length === 0) {
                    throw new Error(
                        "No hay reportes generados disponibles."
                    );
                }

                if (aContexts.length > 1) {
                    throw new Error(
                        "Hay varios reportes generados. " +
                        "Es necesario seleccionar uno desde " +
                        "Historial o indicar el reporte " +
                        "que corresponde al consultor."
                    );
                }

                const oReporte =
                    await aContexts[0].requestObject();

                this.mostrarReporte(oReporte);

            } catch (oError) {
                console.error(
                    "Error al cargar reporte:",
                    oError
                );

                MessageBox.error(
                    oError.message ||
                    "No fue posible cargar el reporte."
                );
            } finally {
                oVista.setBusy(false);
            }
        },

        mostrarReporte: function (oReporte) {
            const sNombreMes =
                this.obtenerNombreMes(oReporte.Mes);

            const sPeriodo =
                sNombreMes + " " + oReporte.Anio;

            const sEstadoTexto =
                oReporte.Estado === "G"
                    ? "Generado"
                    : "Pendiente";

            const oDatos = {
                ReporteUuid: oReporte.ReporteUuid,
                ConsultorUuid: oReporte.ConsultorUuid,
                NombreConsultor:
                    oReporte.NombreConsultor,
                Anio: oReporte.Anio,
                Mes: oReporte.Mes,
                NombreMes: sNombreMes,
                TotalHoras: oReporte.TotalHoras,
                Estado: oReporte.Estado,
                EstadoTexto: sEstadoTexto,
                EstadoColor:
                    oReporte.Estado === "G"
                        ? "Success"
                        : "Warning",
                PeriodoTexto: sPeriodo,
                InformacionConsultor:
                    "Consultor: " +
                    oReporte.NombreConsultor +
                    "  |  Periodo: " + sPeriodo,
                TotalHorasTexto:
                    "Total de horas del periodo: " +
                    oReporte.TotalHoras + " h",
                FechaGeneracion:
                    oReporte.FechaGeneracion || "",
                TienePDF: oReporte.Estado === "G",

                // Hasta consultar RegistrosActividad,
                // no mostramos actividades inventadas.
                Actividades: []
            };

            this.getView()
                .getModel("reporteSeleccionado")
                .setData(oDatos);
        },

        buscarDocumentoPDF: async function (
            sReporteUuid
        ) {
            const oModelo = this.getOwnerComponent()
                .getModel("actividadesOData");

            const oBinding = oModelo.bindList(
                "/DocumentosPDF",
                undefined,
                undefined,
                [
                    new Filter(
                        "ReporteUuid",
                        FilterOperator.EQ,
                        sReporteUuid
                    )
                ],
                {
                    $select:
                        "DocumentoUuid,ReporteUuid," +
                        "NombreArchivo,MimeType,Contenido"
                }
            );

            const aContexts =
                await oBinding.requestContexts(0, 2);

            if (aContexts.length === 0) {
                throw new Error(
                    "No existe un PDF para este reporte."
                );
            }

            if (aContexts.length > 1) {
                throw new Error(
                    "Existen varios PDF para este reporte. " +
                    "Debemos identificar cuál es el vigente."
                );
            }

            return aContexts[0].requestObject();
        },

        descargarArchivoPDF: function (
            oDocumento,
            sNombreArchivo
        ) {
            if (!oDocumento.Contenido) {
                throw new Error(
                    "El documento no contiene datos."
                );
            }

            // Edm.Binary en OData V4: Base64URL.
            const sBase64 = oDocumento.Contenido
                .replace(/-/g, "+")
                .replace(/_/g, "/");

            const sBinario = atob(sBase64);
            const aBytes =
                new Uint8Array(sBinario.length);

            for (let i = 0; i < sBinario.length; i++) {
                aBytes[i] = sBinario.charCodeAt(i);
            }

            const oBlob = new Blob(
                [aBytes],
                {
                    type:
                        oDocumento.MimeType ||
                        "application/pdf"
                }
            );

            const sUrl = URL.createObjectURL(oBlob);
            const oEnlace =
                document.createElement("a");

            oEnlace.href = sUrl;
            oEnlace.download = sNombreArchivo;

            document.body.appendChild(oEnlace);
            oEnlace.click();
            document.body.removeChild(oEnlace);

            setTimeout(function () {
                URL.revokeObjectURL(sUrl);
            }, 1000);
        },

        onDownloadPDF: async function () {
            const oVista = this.getView();

            try {
                const oReporte = oVista
                    .getModel("reporteSeleccionado")
                    .getData();

                if (!oReporte.ReporteUuid) {
                    throw new Error(
                        "No hay un reporte seleccionado."
                    );
                }

                if (oReporte.Estado !== "G") {
                    throw new Error(
                        "El reporte todavía no está generado."
                    );
                }

                oVista.setBusy(true);

                const oDocumento =
                    await this.buscarDocumentoPDF(
                        oReporte.ReporteUuid
                    );

                const sNombreArchivo =
                    "Reporte_Actividades_" +
                    oReporte.NombreMes + "_" +
                    oReporte.Anio + ".pdf";

                this.descargarArchivoPDF(
                    oDocumento,
                    sNombreArchivo
                );

                MessageToast.show(
                    "Descarga del PDF iniciada."
                );

            } catch (oError) {
                console.error(
                    "Error al descargar PDF:",
                    oError
                );

                MessageBox.error(
                    oError.message ||
                    "No fue posible descargar el PDF."
                );

            } finally {
                oVista.setBusy(false);
            }
        },

        onSignReport: function () {
            MessageBox.information(
                "La firma electrónica todavía " +
                "no está implementada en el backend."
            );
        },

        onRequestReopen: function () {
            MessageBox.information(
                "La solicitud de reapertura todavía " +
                "no está implementada en el backend."
            );
        }
    });
});