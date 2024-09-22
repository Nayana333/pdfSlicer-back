"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pdf_lib_1 = require("pdf-lib");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use('/files', express_1.default.static('files'));
// MongoDB connection
const mongoUrl = 'mongodb://localhost:27017/pdf_maker';
mongoose_1.default.connect(mongoUrl).then(() => {
    console.log("Connected to database");
}).catch((e) => {
    console.log(e.message);
});
// Multer setup
// const storage = multer.diskStorage({
//     destination: function (req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
//         cb(null, './files');
//     },
//     filename: function (req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
//         const uniqueSuffix = Date.now();
//         cb(null, uniqueSuffix + file.originalname);
//     }
// });
// Multer setup
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './files');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now();
        cb(null, uniqueSuffix + file.originalname);
    }
});
const upload = (0, multer_1.default)({ storage: storage });
require("./pdfDetails");
const pdfSchema = mongoose_1.default.model('pdfDetails');
// File upload route
app.post('/upload-files', upload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const title = req.body.title;
    const fileName = (_a = req.file) === null || _a === void 0 ? void 0 : _a.filename;
    if (!fileName) {
        return res.status(400).send({ status: "error", message: "No file uploaded" });
    }
    try {
        yield pdfSchema.create({ title: title, pdf: fileName });
        res.send({ status: "OK" });
    }
    catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
}));
// Fetch all files
app.get('/get-files', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        pdfSchema.find({}).then(data => {
            res.send({ status: "ok", data: data });
        });
    }
    catch (error) {
        res.status(500).send({ status: "error", message: error.message });
    }
}));
// Download selected pages route
app.post('/download-selected-pages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pdfFile, selectedPages } = req.body;
    try {
        const filePath = path_1.default.join(__dirname, 'files', pdfFile);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }
        const existingPdfBytes = fs_1.default.readFileSync(filePath);
        const pdfDoc = yield pdf_lib_1.PDFDocument.load(existingPdfBytes);
        const newPdfDoc = yield pdf_lib_1.PDFDocument.create();
        for (const pageNumber of selectedPages) {
            if (pageNumber > 0 && pageNumber <= pdfDoc.getPageCount()) {
                const [page] = yield newPdfDoc.copyPages(pdfDoc, [pageNumber - 1]);
                newPdfDoc.addPage(page);
            }
        }
        const pdfBytes = yield newPdfDoc.save();
        res.setHeader('Content-Disposition', 'attachment; filename=selected_pages.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBytes.length.toString());
        res.end(pdfBytes);
    }
    catch (error) {
        console.error("Error processing PDF:", error);
        res.status(500).send("Error processing PDF");
    }
}));
// Delete file route
app.delete('/delete-file/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const pdfRecord = yield pdfSchema.findById(id);
        if (!pdfRecord) {
            return res.status(404).send('PDF not found');
        }
        const filePath = path_1.default.join(__dirname, 'files', pdfRecord.pdf);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        yield pdfSchema.findByIdAndDelete(id);
        res.send({ status: 'OK' });
    }
    catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).send('Error deleting file');
    }
}));
app.listen(5000, () => {
    console.log('Server started on port 5000');
});
