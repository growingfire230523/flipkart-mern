import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

const unavailableImage = `${process.env.PUBLIC_URL}/lexy-data/unavailable.png`;

export default function ProductCard({ name = '', price = '', brand = '', url = '', concern = [], image = '' }) {
  const redirectProduct = () => {
    if (url) window.location.assign(url);
  };

  const uniqueConcerns = Array.from(new Set((concern || []).filter(Boolean)));

  return (
    <Box onClick={redirectProduct} sx={{ cursor: url ? 'pointer' : 'default', lineHeight: 'low' }}>
      <Card sx={{ width: '100%', height: '100%' }}>
        <CardMedia component="img" height="180" image={image || unavailableImage} alt="Product" />
        <CardContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {brand}
            <Typography component="span" color="text.primary" sx={{ float: 'right', fontWeight: 'bold' }}>
              {price}
            </Typography>
          </Typography>
          <Typography gutterBottom variant="subtitle1" component="div">
            {String(name).length > 48 ? `${String(name).substring(0, 48)}…` : name}
          </Typography>
          <Grid container spacing={0.5}>
            {uniqueConcerns.slice(0, 4).map((c) => (
              <Grid item xs={12} key={c}>
                <Typography
                  variant="caption"
                  color="white"
                  sx={{
                    display: 'inline-block',
                    backgroundColor: 'rgb(var(--lexy-maroon-rgb) / 0.85)',
                    borderRadius: '6px',
                    px: 1,
                    py: 0.25,
                  }}
                >
                  {c}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
