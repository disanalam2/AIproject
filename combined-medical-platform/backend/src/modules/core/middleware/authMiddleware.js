import jwt  from 'jsonwebtoken';

function authMiddleware(req, res, next) {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.user = decoded;
        
        // Block patient from non-patient routes
        if (req.user.role === 'patient' && !req.originalUrl.startsWith('/api/patient')) {
            return res.status(403).json({ error: 'Patients cannot access this endpoint' });
        }

        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
}

export default authMiddleware;
