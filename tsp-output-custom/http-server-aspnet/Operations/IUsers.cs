using MyApp.Api.Models;
using System.Threading;
using System.Threading.Tasks;

namespace MyApp.Api.Operations;

public interface IUsers
{
    public Task<Models.User[]> ListAsync(CancellationToken cancellationToken = default);
    public Task<Models.User> GetAsync(long id, CancellationToken cancellationToken = default);
    public Task<Models.User> CreateAsync(Models.User user, CancellationToken cancellationToken = default);
}
