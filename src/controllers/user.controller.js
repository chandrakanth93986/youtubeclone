import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // Get user details

    const { username, fullName, email, password } = req.body
    // console.log("Email: ", email)

    // Validation - not null input

    if (username === "" || fullName === "" || email === "" || password === "") {
        throw new ApiError(400, "All fields are required!")
    }

    // Check if user already exists: username, email

    const existedUser = await User.findOne({
        $or: [{username} , {email}]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists!")
    }

    // Check for images - avatar (cover image optional)

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is Required!")
    }

    // Upload them to cloudinary - avatar check

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400 , "Avatar file is required!")
    }

    // Create user-object - create entry in db

    const user = await User.create({
        fullName,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password,
        username: username.toLowerCase()
    })

    // Remove password and refresh token field from response

    const createdUser = await User.find(user._id).select(
        "-password -refreshToken"
    )

    // Check for user creation

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // Return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully!")
    )

})

export {registerUser}