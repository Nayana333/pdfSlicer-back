
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const app = express();

app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }));
app.use('/files', express.static('files'));

// MongoDB connection
const mongoUrl = "mongodb+srv://user1:shereef%40123@cluster0.mudxo.mongodb.net/myDatabase?retryWrites=true&w=majority";
mongoose.connect(mongoUrl).then(() => {
    console.log("Connected to database");
}).catch(e => {
    console.log(e);
});

// Multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './files');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now();
        cb(null, uniqueSuffix + file.originalname);
    }
});

const upload = multer({ storage: storage });
require("./pdfDetails");
const pdfSchema = mongoose.model('pdfDetails');

app.post('/upload-files', upload.single('file'), async (req, res) => {
    const title = req.body.title;
    const fileName = req.file.filename;
    console.log(fileName)
    try {
        await pdfSchema.create({ title: title, pdf: fileName });
        res.send({ status: "OK" });
    } catch (error) {
        res.json({ status: error });
    }
});

app.get('/get-files', async (req, res) => {
    try {
        pdfSchema.find({}).then(data => {
            res.send({ status: "ok", data: data });
        });
    } catch (error) {
        res.status(500).send({ status: "error", message: error.message });
    }
});

// Endpoint to download selected pages

app.post('/download-selected-pages', async (req, res) => {
    const { pdfFile, selectedPages } = req.body;

    try {
        const filePath = path.join(__dirname, 'files', pdfFile);

        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }

        const existingPdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const newPdfDoc = await PDFDocument.create();

        for (const pageNumber of selectedPages) {
            console.log(`Adding page number: ${pageNumber}`);
            if (pageNumber > 0 && pageNumber <= pdfDoc.getPageCount()) {
                const [page] = await newPdfDoc.copyPages(pdfDoc, [pageNumber - 1]);
                newPdfDoc.addPage(page);
            }
        }

        const pdfBytes = await newPdfDoc.save();
        res.setHeader('Content-Disposition', 'attachment; filename=selected_pages.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBytes.length); 
        res.end(pdfBytes);

    } catch (error) {
        console.error("Error processing PDF:", error);
        res.status(500).send("Error processing PDF");
    }
});


// Endpoint to delete a PDF file
app.delete('/delete-file/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const pdfRecord = await pdfSchema.findById(id);
        if (!pdfRecord) {
            return res.status(404).send('PDF not found');
        }

        // Delete the file from the filesystem
        const filePath = path.join(__dirname, 'files', pdfRecord.pdf);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete the record from the database
        await pdfSchema.findByIdAndDelete(id);

        res.send({ status: 'OK' });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).send('Error deleting file');
    }
});

app.listen(5000, () => {
    console.log('Server started on port 5000');
});
