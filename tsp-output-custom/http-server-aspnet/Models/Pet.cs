namespace MyApp.Api.Models;

class Pet
{
    public required long Id { get; set; }

    public required string Name { get; set; }

    public Category? Category { get; set; }

    public required string[] PhotoUrls { get; set; }

    public Tag[]? Tags { get; set; }

    public required PetStatus Status { get; set; }
}
