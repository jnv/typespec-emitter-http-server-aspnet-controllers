using Microsoft.AspNetCore.Mvc;
using MyApp.Api.Models;
using MyApp.Api.Operations;
using System.Threading;
using System.Threading.Tasks;

namespace MyApp.Api.Controllers;

[ApiController]
[Route("users")]
public partial class UsersController : ControllerBase
{
    private readonly IUsers _operations;

    public UsersController(IUsers operations)
    {
        _operations = operations;
    }

    [HttpGet]
    public virtual async Task<ActionResult< Models.User[] >> List(CancellationToken cancellationToken)
    {
        var result = await _operations.ListAsync(cancellationToken);
        return Ok(result);
    }
    [HttpGet("{id}")]
    public virtual async Task<ActionResult< Models.User >> Get(
        [FromRoute]
        long id,
        CancellationToken cancellationToken
    )
    {
        var result = await _operations.GetAsync(id, cancellationToken);
        return Ok(result);
    }
    [HttpPost]
    public virtual async Task<ActionResult< Models.User >> Create(
        [FromBody]
        Models.User user,
        CancellationToken cancellationToken
    )
    {
        var result = await _operations.CreateAsync(user, cancellationToken);
        return Ok(result);
    }
}
