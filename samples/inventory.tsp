// Inventory / product catalog models - sample for C# code generation

model Product {
  sku: string;
  name: string;
  description?: string;
  price: decimal;
  quantityInStock: int32;
  category: string;
  discontinued: boolean = false;
}

model StockItem {
  productId: string;
  warehouseId: string;
  quantity: int32;
  reservedQuantity: int32 = 0;
  lastRestocked?: utcDateTime;
}
