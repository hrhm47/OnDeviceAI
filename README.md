# OnDevice AI V2

V2 introduces significant architectural changes. The original OnDevice AI idea has gradually moved toward a cloud-based approach because of limited on-device resources.

In the cloud version, Mistral AI performs the same task that was previously handled on-device by Qwen2.5 1.5B. In testing, this cloud setup is about 20x faster and can fill forms with mostly accurate fields in less than 2 seconds.

## Dataset

This V2 dataset is small and currently covers 1 building. The dataset follows the Congrid style, and most dataset entities are connected to related entities.

The dataset is used to test how recorded observations can be converted into structured form data. Mistral AI extracts the required JSON schema from the user's recorded observation and performs semantic matching against the available work types and issue types.

It also extracts spoken location information, such as space type, unit number, and room names like bathrooms, bedrooms, and corridors.
