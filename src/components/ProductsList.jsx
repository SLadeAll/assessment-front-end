function ProductsList({ products, loading, error }) {
  if (loading) {
    return <div>Loading products...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {products.length === 0 ? (
          <tr>
            <td colSpan="2">No products found.</td>
          </tr>
        ) : (
          products.map((product) => (
            <tr key={product.id || `${product.name}-${product.description}`}>
              <td>{product.name}</td>
              <td>{product.description}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

export default ProductsList
