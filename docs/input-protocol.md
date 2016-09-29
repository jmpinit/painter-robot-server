# Input Protocol

Follows [JSON-RPC spec](http://json-rpc.org/wiki/specification).

For external control devices which specify a position and a set of named proportional attributes.

```
{
    method: 'position',
    params: [{ x, y }, attributes],
    id: <random id string>
}
```

"attributes" is an object containing floats, like the following example:

```
{
    "force": 0.845,
    "angleX": 0.02,
    "angleY": 0.01
}
```
