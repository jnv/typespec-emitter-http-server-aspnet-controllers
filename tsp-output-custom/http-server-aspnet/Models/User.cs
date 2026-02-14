namespace MyApp.Api.Models;

class User
{
    public required long Id { get; set; }

    public required string Email { get; set; }

    public string? Name { get; set; }

    public Address? Address { get; set; }

    public required DateTimeOffset CreatedAt { get; set; }

    public required bool IsActive { get; set; }
}
