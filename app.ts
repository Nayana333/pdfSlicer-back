

import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import PdfDetails from './pdfDetails';
import { config } from "dotenv"
config()

const app = express();
app.use(cors({
    origin: process.env.ORIGINFRONTEND || "https://pagesnip.vercel.app",
    credentials: true
}));
app.use(express.json({ limit: "250mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }))
app.use('/files', express.static('files'));

// MongoDB connection
// const mongoUrl = process.env.MONGOURL;
// mongoose.connect(mongoUrl).then(() => {
//     console.log("Connected to database");
// }).catch((e: Error) => {
//     console.log(e.message);


const mongoUrl = process.env.MONGOURL;
console.log(mongoUrl)
if (!mongoUrl) {
    throw new Error("MongoDB connection URL is missing");
}

mongoose.connect(mongoUrl)
    .then(() => {
        console.log("Connected to database");
    })
    .catch((e: Error) => {
        console.log(e);
    });

// });

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb) => {
        cb(null, './files');
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
        const uniqueSuffix = Date.now();
        cb(null, uniqueSuffix + file.originalname);
    }
});

const upload = multer({ storage: storage });

// File upload route
app.post('/upload-files', upload.single('file'), async (req: Request, res: Response) => {
    const title = req.body.title;
    const fileName = req.file?.filename;
    console.log("dddd");

    if (!fileName) {
        return res.status(400).send({ status: "error", message: "No file uploaded" });
    }

    try {
        await PdfDetails.create({ title: title, pdf: fileName });
        res.send({ status: "OK" });
    } catch (error) {
        res.status(500).json({ status: "error", message: (error as Error).message });
    }
});

// Fetch all files
app.get('/get-files', async (req: Request, res: Response) => {
    try {
        const data = await PdfDetails.find({});
        res.send({ status: "ok", data: data });
    } catch (error) {
        res.status(500).send({ status: "error", message: (error as Error).message });
    }
});

// Download selected pages route
app.post('/download-selected-pages', async (req: Request, res: Response) => {
    const { pdfFile, selectedPages }: { pdfFile: string, selectedPages: number[] } = req.body;

    try {
        const filePath = path.join(__dirname, 'files', pdfFile);

        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }

        const existingPdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const newPdfDoc = await PDFDocument.create();

        for (const pageNumber of selectedPages) {
            if (pageNumber > 0 && pageNumber <= pdfDoc.getPageCount()) {
                const [page] = await newPdfDoc.copyPages(pdfDoc, [pageNumber - 1]);
                newPdfDoc.addPage(page);
            }
        }

        const pdfBytes = await newPdfDoc.save();
        res.setHeader('Content-Disposition', 'attachment; filename=selected_pages.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBytes.length.toString());
        res.end(pdfBytes);

    } catch (error) {
        console.error("Error processing PDF:", error);
        res.status(500).send("Error processing PDF");
    }
});

// Delete file route
app.delete('/delete-file/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const pdfRecord = await PdfDetails.findById(id);
        if (!pdfRecord) {
            return res.status(404).send('PDF not found');
        }

        const filePath = path.join(__dirname, 'files', pdfRecord.pdf);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await PdfDetails.findByIdAndDelete(id);
        res.send({ status: 'OK' });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).send('Error deleting file');
    }
});

app.listen(5000, () => {
    console.log('Server started on port 5000');
});
