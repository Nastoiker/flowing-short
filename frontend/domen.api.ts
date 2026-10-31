export const api_url = "/api"

export const DOMEN = {
  video: {
    create: api_url + "/product/create",
    getAll: api_url + "/product/",
    getByName: api_url + "/product/info:",
    getVideoByTagName: api_url + "/video/tagVideo/:",
    deleteProduct: api_url + "/product/delete",
    update: api_url + "/product/update",
    search: api_url + "/video/found/:",
    getByCategory: api_url + "/product/byCategory",
    getCategory: api_url + "/product/getCategory",
    getById: api_url + "/product/getProductById:",
    getFirstCategory: api_url + "/product/getFirstCategory",
  },
  channel: {
    getBrands: api_url + "/product/getBrands",
  },
  user: {
    search: api_url + "/user/search/:",

    find: api_url + "/users/profile:",
    login: api_url + "/users/login",
    register: api_url + "/users/register",
    getInfoAfterAuth: api_url + "/users/authorAuthorization",
    createAddress: api_url + "/users/createAddress",
    editAddress: api_url + "/users/editAddress",
    editProfile: api_url + "/users/editProfileInfo",
    updateAvatar: api_url + "/users/updateAvatar",
  },
  category: {
    getCategory: api_url + "/category/",
  },
  comment: {
    createComment: api_url + "/product/comment",
  },
  like: {
    setRating: api_url + "/product/setRating",
  },
  admin: {
    createProduct: api_url + "/product/create",
    createModel: api_url + "/product/createModel",
    createCategory: api_url + "/product/setBrandOnSecondCategory",
    createBrand: api_url + "/product/setCategoryOnBrand",
    deleteProduct: api_url + "/delete",
    updatePictureProduct: api_url + "/product/uploadImage",
  },
}
