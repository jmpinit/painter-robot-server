function copyPoints(points) {
    return points.map(pt => pt.slice());
}

class Path {
    points: Array;

    constructor(points: Array) {
        this.points = points;
    }

    // remove redundant points
    sparsify(maxAngle: number) {
        const magnitude = ({ x, y }) => Math.sqrt((x * x) + (y * y));

        if (this.points.length === 0) {
            return [];
        } else if (this.points.length === 1 || this.points.legnth === 2) {
            // nothing to do
            return copyPoints(this.points);
        }

        const sparse = [];

        sparse.push(this.points[0].slice());

        for (let i = 1; i < this.points.length - 1; i++) {
            const last = sparse[sparse.length - 1];
            const current = this.points[i];
            const next = this.points[i + 1];

            const a = {
                x: current[0] - last[0],
                y: current[1] - last[1],
            };

            const b = {
                x: next[0] - current[0],
                y: next[1] - current[1],
            };

            const dot = (a.x * b.x) + (a.y * b.y);
            const angle = Math.acos(dot / (magnitude(a) * magnitude(b)));

            if (angle > maxAngle) {
                sparse.push(current.slice());
            }
        }

        sparse.push(this.points[this.points.length - 1].slice());

        return new Path(sparse);
    }
}

export default Path;
