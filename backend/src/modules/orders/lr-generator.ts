import PDFDocument from 'pdfkit';
import { Order } from '../../models/Order.js';

/**
 * Generates a legally-compliant Lorry Receipt (LR) PDF.
 */
export const generateLorryReceipt = async (orderId: string, carrierRegNo: string, transporterGstin: string): Promise<Buffer> => {
  const order = await Order.findById(orderId).populate('businessOwnerId');
  if (!order) {
    throw new Error('Order not found');
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('LORRY RECEIPT', { align: 'center' });
    doc.moveDown();

    // Mandatory Legal Info
    doc.fontSize(12).text(`Carrier Registration Number: ${carrierRegNo}`);
    doc.text(`Transporter GSTIN: ${transporterGstin}`);
    doc.moveDown();

    // Order Info
    doc.text(`LR/Order Number: ${order.orderNumber}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.text(`E-Way Bill No: ${order.ewayBillNo || 'N/A'}`);
    doc.moveDown();

    // Consignor/Consignee
    doc.text(`Pickup: ${order.pickup.address}, ${order.pickup.city}, ${order.pickup.state} - ${order.pickup.pincode}`);
    doc.text(`Delivery: ${order.delivery.address}, ${order.delivery.city}, ${order.delivery.state} - ${order.delivery.pincode}`);
    doc.moveDown();

    // Cargo Manifest
    doc.text(`Cargo Description: ${order.cargo.description}`);
    doc.text(`Quantity: ${order.cargo.quantity}`);
    doc.text(`Weight: ${order.cargo.weightKg} kg`);
    doc.text(`Consignment Value: Rs. ${order.consignmentValue}`);
    doc.moveDown();

    // Declaration
    doc.fontSize(10).text('Issued under the Carriage by Road Act, 2007', { align: 'center', underline: true });

    doc.end();
  });
};
