import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import ProductCard from './ProductCard';

const Recommendations = ({ data }) => {
  const general = data?.general || {};
  const makeup = data?.makeup || [];

  const toCardProps = (prod) => {
    const id = prod?._id;
    const url = id ? `/product/${id}` : '';
    const image = Array.isArray(prod?.images) ? prod.images?.[0]?.url : prod?.image;
    const brand = prod?.brand?.name || prod?.brand || '';
    const price = typeof prod?.price === 'number' ? `₹${prod.price}` : prod?.price || '';
    return {
      name: prod?.name,
      brand,
      image,
      price,
      url,
      concern: prod?.concern || [],
    };
  };

  return (
    <Container sx={{ mt: 2, pb: 2, px: 1 }} maxWidth={false}>
      <Typography gutterBottom variant="h5" component="div" mt={1} textAlign="center">
        Skin care
      </Typography>

      {Object.keys(general).map((type) => (
        <div key={type}>
          <Typography gutterBottom variant="h6" component="div" mt={2} color="text.secondary">
            {type}
          </Typography>
          <Grid container spacing={1}>
            {(general[type] || []).slice(0, 4).map((prod) => (
              <Grid item xs={6} md={3} key={`${type}-${prod?._id || prod?.url || ''}-${prod?.name || ''}`}>
                <ProductCard {...toCardProps(prod)} />
              </Grid>
            ))}
          </Grid>
        </div>
      ))}

      <Typography gutterBottom variant="h5" component="div" mt={3} textAlign="center">
        Make up
      </Typography>

      <Grid container spacing={1}>
        {makeup.slice(0, 6).map((prod) => (
          <Grid item xs={6} md={3} key={`${prod?._id || prod?.url || ''}-${prod?.name || ''}`}>
            <ProductCard {...toCardProps(prod)} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Recommendations;
