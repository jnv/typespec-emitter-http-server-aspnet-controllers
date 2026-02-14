namespace MyApp.Api.Models;

class Product
{
    public required string Sku { get; set; }

    public required string Name { get; set; }

    public string? Description { get; set; }

    public required decimal Price { get; set; }

    public required int QuantityInStock { get; set; }

    public required string Category { get; set; }

    public required bool Discontinued { get; set; }
}
