/**
 * Module 2 (Procurement/Inventory) Integration Adapter.
 * 
 * Provides decoupled supplier and PO resolution.
 * When Module 2 is not yet present, gracefully falls back to direct snapshot data.
 */

async function getSupplierSnapshot(companyId, supplierId) {
  // If Module 2's Supplier model is connected in the future, query it here:
  // return await Supplier.findOne({ _id: supplierId, companyId });
  return null;
}

async function getPurchaseOrderSnapshot(companyId, purchaseOrderId) {
  // If Module 2's PurchaseOrder model is connected in the future, query it here:
  // return await PurchaseOrder.findOne({ _id: purchaseOrderId, companyId });
  return null;
}

module.exports = {
  getSupplierSnapshot,
  getPurchaseOrderSnapshot
};
