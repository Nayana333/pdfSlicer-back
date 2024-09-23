import mongoose, { Document, Schema, Model } from 'mongoose';

// Define the interface for PDF details
interface IPdfDetails extends Document {
    pdf: string;
    title: string;
}

// Create the schema for PDF details
const pdfDetailsSchema: Schema<IPdfDetails> = new Schema(
    {
        pdf: { type: String, required: true },
        title: { type: String, required: true },
    },
    { collection: 'pdfDetails' }
);

// Create and export the model
const PdfDetails: Model<IPdfDetails> = mongoose.model<IPdfDetails>('pdfDetails', pdfDetailsSchema);

export default PdfDetails;
