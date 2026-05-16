import { toSideKey } from "../constants/productMeta.js";
import { uploadBase64Image } from "../services/cloudinaryService.js";

const extractDesignEntries = (body) => {
  const designs = {};

  if (body && typeof body.designs === "object" && body.designs !== null) {
    Object.entries(body.designs).forEach(([key, value]) => {
      if (value) {
        designs[toSideKey(key)] = String(value);
      }
    });
  }

  const legacyEntries = {
    front: body.frontDesign,
    back: body.backDesign,
    leftSleeve: body.leftSleeveDesign,
    rightSleeve: body.rightSleeveDesign
  };

  Object.entries(legacyEntries).forEach(([key, value]) => {
    if (value) {
      designs[toSideKey(key)] = String(value);
    }
  });

  return designs;
};

export const uploadDesign = async (req, res, next) => {
  try {
    const designEntries = extractDesignEntries(req.body || {});

    if (Object.keys(designEntries).length === 0) {
      return res.status(400).json({ message: "At least one design image is required." });
    }

    const uploadedEntries = await Promise.all(
      Object.entries(designEntries).map(async ([sideKey, base64Design]) => {
        const url = await uploadBase64Image(base64Design, `custom-tee/designs/${sideKey}`);
        return [sideKey, url];
      })
    );

    const designUrls = Object.fromEntries(uploadedEntries);

    return res.status(200).json({
      frontDesignUrl: designUrls.front || "",
      backDesignUrl: designUrls.back || "",
      leftSleeveDesignUrl:
        designUrls["left-sleeve"] || designUrls.leftsleeve || designUrls.leftSleeve || "",
      rightSleeveDesignUrl:
        designUrls["right-sleeve"] || designUrls.rightsleeve || designUrls.rightSleeve || "",
      designUrls
    });
  } catch (error) {
    next(error);
  }
};
