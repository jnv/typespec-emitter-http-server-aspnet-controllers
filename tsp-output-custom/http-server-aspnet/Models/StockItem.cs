namespace MyApp.Api.Models;

class StockItem
{
    public required string ProductId { get; set; }

    public required string WarehouseId { get; set; }

    public required int Quantity { get; set; }

    public required int ReservedQuantity { get; set; }

    public DateTimeOffset? LastRestocked { get; set; }
}
