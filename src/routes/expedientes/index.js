let express = require('express');
let router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');

router.post('/generar-pdf', async (req, res, next) => {

    try {

        let expedienteData = req.body

        // Crear el documento PDF
        const doc = new PDFDocument({ margin: 30 });

        // Ruta de salida del PDF
        const outputPath = 'Certificado_Catastral.pdf';
        const stream = fs.createWriteStream(outputPath);

        let logo = `${process.env.PATH_LOGO}/logo.jpg`

        // Encabezado del documento
        doc.pipe(stream);

        // Logo e información del título
        doc.image(logo, 30, 10, { width: 270, height: 60 }); // Logo

        // 2. Texto adicional (Gerencia General, lado derecho)
        doc.font('Helvetica-Bold').fontSize(8)
            .text('Gerencia General', 300, 30, { align: 'left' })
            .text('Dirección General del Servicio Nacional de Catastro', 300, 40, { align: 'left' })

        // 3. Título del Certificado (centrado)

        doc.rect(30, 60, 400, 30).stroke(); // Rectángulo principal

        doc.moveDown(2)
            .font('Helvetica-Bold')
            .fontSize(10)
            .text('Certificado Catastral de Inmuebles', 30, 80, { align: 'center', width: 400 })

        doc.rect(30, 90, 400, 13).stroke()
            .text('ART. 64 LEY 125/91', { align: 'center', width: 400 });


        doc.rect(430, 60, 150, 57).stroke()
        doc.font('Helvetica-Bold')
            .font('Helvetica-Oblique')
            .text('Solicitud/Formulario Nº.:', 440, 70, { align: 'left' })
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`${expedienteData.formularioNro}`, 400, 90, { align: 'center' })


        doc.rect(30, 60, 400, 57).stroke()
            .font('Helvetica-Bold')
            .text(`EXPEDIENTE NRO.: ${expedienteData.expedienteNro}`, 35, 106, { align: 'left' })
            .text(`AÑO: ${expedienteData.anio}`, 250, 106, { align: 'left' })

        doc.rect(30, 117, 400, 50).stroke()
            .font('Helvetica')
            .text(`La Dirección General del Servicio Nacional de Catastro, ante el pedido formulado por el(la) Sr.(a) (Nombre del Escribano Público), en el que solicita la certificación respecto al(los) inmueble(s), con N°. de (Nomenclatura Catastral) mencionado(s) más abajo, y `, 35, 120, { align: 'left', width: 400 })
            .font('Helvetica-Bold')
            .text(`según datos obrantes en la base de datos de la D.G.S.N.C.,`, 35, 155, { align: 'left', width: 400 })

        doc.rect(430, 117, 150, 50).stroke()
            .font('Helvetica-Bold')
            .text(`Certificado N°: `, 440, 130, { align: 'left' })
            .fontSize(10)
            .text(`${expedienteData.certificadoNro}`, 400, 150, { align: 'center' })

        // 4. Crear tabla de **Departamento, Distrito y Lugar**
        const startX = 30;
        const startY = 167;
        const cellWidth = 200;
        const cellHeight = 25;

        // Dibujar los bordes de la tabla
        doc.lineWidth(1);

        // Encabezados
        doc.rect(startX, startY, cellWidth, 20).stroke();
        doc.rect(startX + cellWidth, startY, cellWidth, 20).stroke();
        doc.rect(startX + 2 * cellWidth, startY, 150, 20).stroke();

        // Texto de los encabezados
        doc.font('Helvetica-Bold')
            .fontSize(10)
            .text('Departamento', startX + 5, startY + 5, { width: cellWidth, align: 'center' })
            .text('Distrito', startX + cellWidth + 5, startY + 5, { width: cellWidth, align: 'center' })
            .text('Lugar', startX + 2 * cellWidth + 5, startY + 5, { width: 150, align: 'center' });

        // Valores
        doc.rect(startX, startY + 20, cellWidth, cellHeight).stroke();
        doc.rect(startX + cellWidth, startY + 20, cellWidth, cellHeight).stroke();
        doc.rect(startX + 2 * cellWidth, startY + 20, 150, cellHeight).stroke();

        // Texto de los valores
        doc.font('Helvetica')
            .fontSize(10)
            .text(expedienteData.departamento, startX + 5, startY + cellHeight + 5, { width: cellWidth, align: 'center' })
            .text(expedienteData.distrito, startX + cellWidth + 5, startY + cellHeight + 5, { width: cellWidth, align: 'center' })
            .text(expedienteData.lugar, startX + 2 * cellWidth + 5, startY + cellHeight + 5, { width: 150, align: 'center' });

        // 5. Nueva fila para Lote, Manzana, Finca / Matrícula y Nomenclatura Catastral
        const startY2 = startY + 2 * cellHeight - 5; // Nueva posición debajo de la tabla anterior
        const loteWidth = 90; // Tamaño específico para cada celda
        const manzanaWidth = 70;
        const fincaWidth = 130;
        const nomenclaturaWidth = 260;

        // Dibujar los bordes para la nueva fila
        doc.rect(startX, startY2, loteWidth, 20).stroke(); // Lote
        doc.rect(startX + loteWidth, startY2, manzanaWidth, 20).stroke(); // Manzana
        doc.rect(startX + loteWidth + manzanaWidth, startY2, fincaWidth, 20).stroke(); // Finca / Matrícula
        doc.rect(startX + loteWidth + manzanaWidth + fincaWidth, startY2, nomenclaturaWidth, 20).stroke(); // Nomenclatura Catastral

        // Encabezados de la nueva fila
        doc.font('Helvetica-Bold')
            .text('Lote', startX + 5, startY2 + 5, { width: loteWidth, align: 'center' })
            .text('Manzana', startX + loteWidth + 5, startY2 + 5, { width: manzanaWidth, align: 'center' })
            .text('Finca / Matrícula', startX + loteWidth + manzanaWidth + 5, startY2 + 5, { width: fincaWidth, align: 'center' })
            .text('Nomenclatura Catastral', startX + loteWidth + manzanaWidth + fincaWidth + 5, startY2 + 5, { width: nomenclaturaWidth, align: 'center' });

        doc.rect(startX, startY2 + 20, loteWidth, cellHeight).stroke(); // Lote (valores)
        doc.rect(startX + loteWidth, startY2 + 20, manzanaWidth, cellHeight).stroke(); // Manzana (valores)
        doc.rect(startX + loteWidth + manzanaWidth, startY2 + 20, fincaWidth, cellHeight).stroke(); // Finca / Matrícula (valores)
        doc.rect(startX + loteWidth + manzanaWidth + fincaWidth, startY2 + 20, nomenclaturaWidth, cellHeight).stroke(); // Nomenclatura Catastral (valores)

        // Valores de la nueva fila
        doc.font('Helvetica')
            .text(expedienteData.lote, startX + 5, startY2 + cellHeight, { width: loteWidth, align: 'center' })
            .text(expedienteData.manzana, startX + loteWidth + 5, startY2 + cellHeight, { width: manzanaWidth, align: 'center' })
            .text(expedienteData.fincaMatricula, startX + loteWidth + manzanaWidth + 5, startY2 + cellHeight, { width: fincaWidth, align: 'center' })
            .text(expedienteData.nomenclaturaCatastral, startX + loteWidth + manzanaWidth + fincaWidth + 5, startY2 + cellHeight, { width: nomenclaturaWidth, align: 'center' });

        // 6. Sección de "Superficie" y "Evaluación Fiscal Total"
        const startY3 = 257; // Nueva posición debajo de las tablas anteriores
        const surfaceWidth = 370;
        const evalWidth = 180;

        // Dibujar los bordes
        doc.rect(startX, startY3, surfaceWidth, 20).stroke(); // Superficie
        doc.rect(startX + surfaceWidth, startY3, evalWidth, 20).stroke(); // Evaluación Fiscal

        doc.font('Helvetica-Bold')
            .text('Superficie', startX + 5, startY3 + 5, { width: surfaceWidth, align: 'center' })
            .text('Evaluación Fiscal Total', startX + surfaceWidth + 5, startY3 + 5, { width: evalWidth, align: 'center' });

        doc.rect(startX, startY3 + 20, surfaceWidth, cellHeight).stroke(); // Valor de Superficie
        doc.rect(startX + surfaceWidth, startY3 + 20, evalWidth, cellHeight).stroke(); // Valor de Evaluación Fiscal

        doc.font('Helvetica')
            .text(expedienteData.superficie, startX + 5, startY3 + cellHeight + 5, { width: surfaceWidth, align: 'center' })
            .text(expedienteData.evaluacionFiscal, startX + surfaceWidth + 5, startY3 + cellHeight + 5, { width: evalWidth, align: 'center' });

        // 3. Sección "Titular del Inmueble" y "C.I. / R.U.C."
        const titularY = startY3 + 2 * cellHeight - 5;
        const titularWidth = 420;
        const rucX = startX + titularWidth;
        const rucWidth = 130;


        // Dibujar los bordes
        doc.rect(startX, titularY, titularWidth, 20).stroke(); // Titular del Inmueble
        doc.rect(startX + titularWidth, titularY, rucWidth, 20).stroke(); // C.I. / R.U.C.

        doc.font('Helvetica-Bold')
            .text('Titular del Inmueble conforme a la base de datos DGSNC', startX + 5, titularY + 5, { width: titularWidth, align: 'center' })
            .text('C.I. / R.U.C', rucX, titularY + 5, { width: rucWidth, align: 'center' });

        doc.rect(startX, titularY + 20, titularWidth, cellHeight + 10).stroke(); // Valor Titular
        doc.rect(startX + titularWidth, titularY + 20, rucWidth, cellHeight + 10).stroke(); // Valor C.I. / R.U.C.

        doc.font('Helvetica')
            .text(expedienteData.titular, startX + 5, titularY + cellHeight + 10, { width: titularWidth, align: 'center' })
            .text(expedienteData.cji, rucX, titularY + cellHeight + 10, { width: rucWidth, align: 'center' });

        // 1. Encabezado de la tabla
        let startY4 = 365; // Posición inicial para la tabla
        const colWidths = [100, 70, 80, 80, 220]; // Ancho de columnas: Lado, Mide, Mts, Cm, Extra
        const rowHeight = 20;


        doc.rect(startX, startY4 - 8, 550, 400).stroke();

        // Dibujar el título
        doc.font('Helvetica-Bold')
            .fontSize(12)
            .text('MEDIDAS LINEALES Y LINDEROS', startX, startY4, { align: 'center', width: 550 });
        startY4 += 15;

        // 1. Dibujar las filas de la tabla sin cabecera
        doc.lineWidth(1);

        expedienteData.medidasLineales.map((medida) => {
            // Dibujar las celdas
            doc.rect(startX, startY4, colWidths[0], rowHeight).stroke(); // Lado
            doc.rect(startX + colWidths[0], startY4, colWidths[1], rowHeight).stroke(); // Mide
            doc.rect(startX + colWidths[0] + colWidths[1], startY4, colWidths[2], rowHeight).stroke(); // Mts.
            doc.rect(startX + colWidths[0] + colWidths[1] + colWidths[2], startY4, colWidths[3], rowHeight).stroke(); // Cm
            doc.rect(startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], startY4, colWidths[4], rowHeight).stroke(); // Extra

            // Insertar los valores dinámicamente
            doc.font('Helvetica-Bold').fontSize(10)
                .text(medida.lado, startX + 5, startY4 + 5, { width: colWidths[0], align: 'left' });

            doc.font('Helvetica').fontSize(10)
                .text(`Mide ${medida.mide}`, startX + colWidths[0] + 5, startY4 + 5, { width: colWidths[1], align: 'left' });

            doc.font('Helvetica-Bold').text(`mts. ${medida.mts}`, startX + colWidths[0] + colWidths[1] + 5, startY4 + 5, { width: colWidths[2], align: 'left' });

            doc.text(`cm ${medida.cm}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, startY4 + 5, { width: colWidths[3], align: 'left' });
            doc.font('Helvetica');

            doc.text(medida.extra, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 5, startY4 + 5, {
                width: colWidths[4],
                align: 'left',
            });

            // Mover hacia la siguiente fila
            startY4 += rowHeight;
        });

        // 3. Observaciones
        startY4 += 10;
        doc.font('Helvetica-Bold')
            .text('OBSERVACIONES TECNICAS / JURIDICAS:', startX + 5, startY4, { align: 'left' });
        doc.font('Helvetica')
            .text(expedienteData.observaciones, startX + 5, startY4 + 15, { align: 'left', width: 500 });

        doc.font('Helvetica-Bold').text('El presente servicio ha sido aprobado por las Resoluciones M. H. N° 207/2018, SNC N° 401/2018 y SNC N°57/2018. Es expedido teniendo en cuenta la utilidad establecida en el artículo 64 de la Ley 125/91. Así mismo, su contenido tiene carácter declarativo.', startX + 5, startY4 + 210, { align: 'left', width: 550 });
        // Finalizar el documento
        doc.end();

        console.log(`PDF generado exitosamente en ${outputPath}`);

        res.download(outputPath, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error al descargar el PDF');
            }
            fs.unlinkSync(outputPath); // Eliminar el archivo temporal
        });

    } catch (error) {
        console.log(error)
        next(error)
    }

})

module.exports = router;
