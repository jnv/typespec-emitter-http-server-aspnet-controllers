namespace MyApp.Api.Models;

class SimpleEntity
{
    public required int Id { get; set; }

    public required string Name { get; set; }

    public required long Count { get; set; }

    public string[]? Tags { get; set; }
}
